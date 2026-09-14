import { getBaseUrlForRegion } from './config';
import { Logger } from '../utils/logger';

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

export const getProjectGroups = async (token, regionName, projectId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  try {
    const response = await fetch(`${baseUrl}/tc/api/2.0/groups?projectId=${projectId}`, {
      headers: authHeaders(token),
    });
    if (!response.ok) return [];
    return asList(await response.json());
  } catch (error) {
    Logger.warn(`Could not load crews for project ${projectId}`, error.message);
    return [];
  }
};

export const getGroupUsers = async (token, regionName, groupId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  try {
    const response = await fetch(`${baseUrl}/tc/api/2.0/groups/${groupId}/users`, {
      headers: authHeaders(token),
    });
    if (!response.ok) return [];
    return asList(await response.json());
  } catch (error) {
    Logger.warn(`Could not load members of crew ${groupId}`, error.message);
    return [];
  }
};

export const createProjectGroup = async (token, regionName, projectId, groupName) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/groups`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ name: groupName, projectId }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not create crew "${groupName}" (${response.status}). ${body}`.trim());
  }

  Logger.success(`Created crew "${groupName}" in project ${projectId}.`);
  return response.json();
};

export const addUserToGroup = async (token, regionName, groupId, userId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/groups/${groupId}/users`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify([{ id: userId }]),
  });
  return response.ok;
};

export const removeUserFromGroup = async (token, regionName, groupId, userId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/groups/${groupId}/users`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
    body: JSON.stringify([{ id: userId }]),
  });
  return response.ok || response.status === 204;
};

/**
 * Loads every crew for the given projects, tagged with its project so the UI can group by site.
 * Runs in small batches to stay friendly to the API.
 */
export const getCrewsByProject = async (token, regionName, projects, onProgress) => {
  const list = asList(projects).filter((project) => project?.id);
  if (list.length === 0) return [];

  const result = [];
  const batchSize = 5;

  for (let index = 0; index < list.length; index += batchSize) {
    const batch = list.slice(index, index + batchSize);

    const loaded = await Promise.all(
      batch.map(async (project) => {
        const groups = await getProjectGroups(token, regionName, project.id);
        return {
          projectId: project.id,
          projectName: project.name || project.title || 'Untitled project',
          crews: groups
            .map((group) => ({ id: group.id, name: group.name }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name))),
        };
      }),
    );

    result.push(...loaded);
    if (onProgress) onProgress(Math.round(((index + batch.length) / list.length) * 100));
  }

  return result.sort((a, b) => a.projectName.localeCompare(b.projectName));
};
