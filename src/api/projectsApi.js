import { getBaseUrlForRegion } from './config';
import { Logger } from '../utils/logger';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

export const getProjects = async (token, regionName) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  try {
    const response = await fetch(`${baseUrl}/tc/api/2.0/projects`, { headers: authHeaders(token) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    Logger.info(`Loaded ${Array.isArray(data) ? data.length : 0} projects from ${regionName}.`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    Logger.error(`Could not load projects from ${regionName}`, error.message);
    throw new Error(`Projects could not be loaded (${error.message}).`);
  }
};

export const getProjectDetails = async (token, regionName, projectId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/projects/${projectId}?fullyLoaded=true`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    Logger.error(`Could not load project ${projectId} (${response.status}): ${body}`);
    throw new Error(`Trimble returned status ${response.status} for this project.`);
  }

  return response.json();
};
