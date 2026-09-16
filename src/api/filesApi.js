import { getBaseUrlForRegion } from './config';
import { getProjectDetails } from './projectsApi';
import { Logger } from '../utils/logger';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

const jsonHeaders = (token) => ({
  ...authHeaders(token),
  'Content-Type': 'application/json',
});

const readRootId = (project) =>
  project?.rootId || project?.rootFolderId || project?.root?.id || '';

/**
 * Every Trimble Connect project has one filesystem root. That folder's id is `project.rootId`
 * on the Project object (Workspace API and GET /projects/{id}) — never the project id itself.
 * Uploads into "the project root" must use parentId = rootId and parentType = FOLDER.
 *
 * A folder snapshot is not a source of truth: it often omits the root and only lists children,
 * which is why creating a nested "SitePass Logs" folder failed with MISSING_REQUIRED_PARAM.
 */
export const getProjectRootId = async (token, region, projectId, knownProject) => {
  const fromKnown = readRootId(knownProject);
  if (fromKnown) return fromKnown;

  const details = await getProjectDetails(token, region, projectId);
  const fromProject = readRootId(details);
  if (fromProject) return fromProject;

  throw new Error('This project has no root folder id (rootId).');
};

const uploadFileBlob = async (token, region, rootFolderId, fileName, fileBlob) => {
  const baseUrl = getBaseUrlForRegion(region);
  const parentId = encodeURIComponent(rootFolderId);
  const initResponse = await fetch(
    `${baseUrl}/tc/api/2.0/files/fs/upload?parentId=${parentId}&parentType=FOLDER`,
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

/**
 * Writes text files into the project root (the folder identified by project.rootId).
 * `files` is [{ name, content, type }].
 */
export const saveFilesToProjectRoot = async (token, region, projectId, files, knownProject) => {
  const rootId = await getProjectRootId(token, region, projectId, knownProject);
  const saved = [];

  for (const file of files) {
    const blob = new Blob([file.content], { type: file.type || 'text/plain' });
    await uploadFileBlob(token, region, rootId, file.name, blob);
    saved.push(file.name);
  }

  Logger.success(`Saved ${saved.length} audit file(s) to the project root (${rootId}).`);
  return { folderId: rootId, files: saved };
};

/** @deprecated Use saveFilesToProjectRoot — kept so existing callers keep working. */
export const saveFilesToLogsFolder = saveFilesToProjectRoot;
