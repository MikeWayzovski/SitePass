import { getBaseUrlForRegion } from './config';
import { Logger } from '../utils/logger';

export const LOGS_FOLDER_NAME = 'SitePass Logs';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

const jsonHeaders = (token) => ({
  ...authHeaders(token),
  'Content-Type': 'application/json',
});

const asList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getProjectSnapshot = async (token, region, projectId) => {
  const baseUrl = getBaseUrlForRegion(region);
  const response = await fetch(
    `${baseUrl}/tc/api/2.0/files/fs/snapshot?projectId=${projectId}&objectTypes=FOLDER&maxItems=100000`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not read the project folders (${response.status}). ${body}`.trim());
  }
  return response.json();
};

/**
 * Looks up a folder by path on the 2.1 API when available, otherwise scans the 2.0 snapshot.
 */
const findLogsFolder = async (token, region, projectId) => {
  const baseUrl = getBaseUrlForRegion(region);
  const encoded = encodeURIComponent(LOGS_FOLDER_NAME);

  try {
    const byPath = await fetch(
      `${baseUrl}/tc/api/2.1/folders/by_path?projectId=${projectId}&path=${encoded}`,
      { headers: authHeaders(token) },
    );
    if (byPath.ok) {
      const data = await byPath.json();
      const id = data?.id || data?.folderId;
      if (id) return id;
    }
  } catch (error) {
    Logger.warn('Folder-by-path lookup is not available, falling back to the snapshot.', error.message);
  }

  const snapshot = await getProjectSnapshot(token, region, projectId);
  const items = asList(snapshot);
  const folders = items.filter((item) => item.tp === 'FOLDER' || item.type === 'FOLDER');
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const roots = folders.filter((folder) => !folder.pid || !byId.has(folder.pid));
  const rootId = roots.length === 1 ? roots[0].id : null;
  const nameOf = (folder) => folder.nm || folder.name || '';

  const match = folders.find((folder) => {
    const name = nameOf(folder).toLowerCase();
    if (name !== LOGS_FOLDER_NAME.toLowerCase()) return false;
    return !rootId || folder.pid === rootId || folder.id === rootId;
  });

  return match?.id || null;
};

const findRootFolderId = async (token, region, projectId) => {
  const snapshot = await getProjectSnapshot(token, region, projectId);
  const items = asList(snapshot);
  const folders = items.filter((item) => item.tp === 'FOLDER' || item.type === 'FOLDER');
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const roots = folders.filter((folder) => !folder.pid || !byId.has(folder.pid));
  return roots.length === 1 ? roots[0].id : roots[0]?.id || null;
};

const createFolder = async (token, region, projectId, name, parentId) => {
  const baseUrl = getBaseUrlForRegion(region);
  const body = { name, projectId };
  if (parentId) body.parentId = parentId;

  const response = await fetch(`${baseUrl}/tc/api/2.0/folders`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Could not create folder "${name}" (${response.status}). ${text}`.trim());
  }

  return response.json();
};

const uploadFileBlob = async (token, region, parentFolderId, fileName, fileBlob) => {
  const baseUrl = getBaseUrlForRegion(region);
  const initResponse = await fetch(
    `${baseUrl}/tc/api/2.0/files/fs/upload?parentId=${parentFolderId}&parentType=FOLDER`,
    {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ name: fileName }),
    },
  );

  if (!initResponse.ok) {
    const text = await initResponse.text().catch(() => '');
    throw new Error(`Could not start the upload (${initResponse.status}). ${text}`.trim());
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.contents?.[0]?.url || initData.uploadUrl;
  if (!uploadUrl) throw new Error('Trimble did not return an upload URL.');

  const putResponse = await fetch(uploadUrl, { method: 'PUT', body: fileBlob });
  if (!putResponse.ok) throw new Error(`Uploading the file failed (${putResponse.status}).`);
  return initData;
};

export const ensureLogsFolder = async (token, region, projectId) => {
  const existing = await findLogsFolder(token, region, projectId);
  if (existing) return existing;

  const parentId = await findRootFolderId(token, region, projectId);
  const created = await createFolder(token, region, projectId, LOGS_FOLDER_NAME, parentId);
  Logger.success(`Created "${LOGS_FOLDER_NAME}" in project ${projectId}.`);
  return created.id;
};

/**
 * Writes one or more text files into the project's SitePass Logs folder.
 * `files` is [{ name, content, type }].
 */
export const saveFilesToLogsFolder = async (token, region, projectId, files) => {
  const folderId = await ensureLogsFolder(token, region, projectId);
  const saved = [];

  for (const file of files) {
    const blob = new Blob([file.content], { type: file.type || 'text/plain' });
    await uploadFileBlob(token, region, folderId, file.name, blob);
    saved.push(file.name);
  }

  Logger.success(`Saved ${saved.length} audit file(s) to "${LOGS_FOLDER_NAME}".`);
  return { folderId, files: saved };
};
