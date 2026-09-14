import { getBaseUrlForRegion, GLOBAL_BASE_URL } from './config';
import { Logger } from '../utils/logger';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

const jsonHeaders = (token) => ({
  ...authHeaders(token),
  'Content-Type': 'application/json',
});

export const getCurrentUser = async (token) => {
  try {
    // User profiles are global, so this always targets the master region.
    const response = await fetch(`${GLOBAL_BASE_URL}/tc/api/2.0/users/me`, { headers: authHeaders(token) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    // Embedded tokens are often scoped away from the global profile endpoint. Returning a
    // placeholder keeps the header rendering instead of crashing the whole shell.
    Logger.warn('Could not load the signed-in user profile:', error.message);
    return null;
  }
};

export const getProjectUsers = async (token, regionName, projectId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/projects/${projectId}/users`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    Logger.warn(`Could not load members of project ${projectId} (${response.status}).`);
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getUserDetails = async (token, regionName, projectId, userId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  // The project-scoped endpoint avoids the 403 the global one returns for non-admins.
  const response = await fetch(`${baseUrl}/tc/api/2.0/projects/${projectId}/users/${userId}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    Logger.warn(`Could not load user ${userId} in project ${projectId} (${response.status}).`);
    return null;
  }

  return response.json();
};

export const findProjectUserByEmail = async (token, regionName, projectId, email) => {
  const users = await getProjectUsers(token, regionName, projectId);
  const needle = String(email || '').toLowerCase().trim();
  return users.find((user) => String(user.email || '').toLowerCase() === needle) || null;
};

export const addUserToProject = async (token, regionName, projectId, email, role, notify = true) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/projects/${projectId}/users?notify=${notify}`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not add ${email} to the project (${response.status}). ${body}`.trim());
  }

  return response.json();
};

export const removeUserFromProject = async (token, regionName, projectId, userId) => {
  const baseUrl = getBaseUrlForRegion(regionName);
  const response = await fetch(`${baseUrl}/tc/api/2.0/projects/${projectId}/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!response.ok && response.status !== 204) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not remove the member from the project (${response.status}). ${body}`.trim());
  }

  return true;
};
