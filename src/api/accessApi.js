import { Logger } from '../utils/logger';
import {
  getProjectGroups,
  getGroupUsers,
  createProjectGroup,
  addUserToGroup,
  removeUserFromGroup,
} from './groupsApi';
import {
  getProjectUsers,
  findProjectUserByEmail,
  addUserToProject,
  removeUserFromProject,
} from './usersApi';

const BATCH_SIZE = 4;

const runInBatches = async (items, worker, onProgress) => {
  const output = [];
  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE);
    output.push(...(await Promise.all(batch.map(worker))));
    if (onProgress) onProgress(Math.round(((index + batch.length) / items.length) * 100));
  }
  return output;
};

export const fullName = (user) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '';

/**
 * Everyone who is active on at least one of the given projects, de-duplicated by user id and
 * annotated with the projects they appear on. This is the people picker behind every SitePass flow.
 */
export const listPeopleAcrossProjects = async (token, region, projects, onProgress) => {
  const byId = new Map();

  await runInBatches(
    projects,
    async (project) => {
      const users = await getProjectUsers(token, region, project.id);
      users.forEach((user) => {
        if (user.status && user.status !== 'ACTIVE') return;

        const existing = byId.get(user.id);
        if (existing) {
          existing.projectIds.push(project.id);
          return;
        }

        byId.set(user.id, {
          ...user,
          name: fullName(user),
          projectIds: [project.id],
        });
      });
    },
    onProgress,
  );

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Reads what one person can actually reach: their role per project plus group membership.
 * `projects` should already be narrowed to the ones worth scanning, since each one costs calls.
 */
export const buildAccessProfile = async ({ token, region, projects, userId, email, onProgress }) => {
  const profile = [];

  await runInBatches(
    projects,
    async (project) => {
      const members = await getProjectUsers(token, region, project.id);
      const match = members.find((member) =>
        userId ? member.id === userId : String(member.email || '').toLowerCase() === String(email || '').toLowerCase(),
      );
      if (!match) return;

      const projectGroups = await getProjectGroups(token, region, project.id);
      const groups = [];

      for (const group of projectGroups) {
        const groupUsers = await getGroupUsers(token, region, group.id);
        if (groupUsers.some((groupUser) => groupUser.id === match.id)) {
          groups.push({ id: group.id, name: group.name });
        }
      }

      profile.push({
        projectId: project.id,
        projectName: project.name || 'Untitled project',
        userId: match.id,
        role: match.role || 'USER',
        groups: groups.sort((a, b) => String(a.name).localeCompare(String(b.name))),
      });
    },
    onProgress,
  );

  return profile.sort((a, b) => a.projectName.localeCompare(b.projectName));
};

/**
 * Grants access. `targets` is [{ projectId, projectName, role, groupNames: [] }].
 * Groups are matched by name so a template from one project can be applied to another.
 * Returns a per-step report instead of throwing, so partial success stays visible.
 */
export const grantAccess = async ({
  token,
  region,
  email,
  targets,
  notify = true,
  createMissingGroups = true,
  onStep,
}) => {
  const report = [];
  const record = (entry) => {
    report.push(entry);
    if (onStep) onStep(entry);
    return entry;
  };

  for (const target of targets) {
    const label = target.projectName || target.projectId;

    let user;
    try {
      user = await findProjectUserByEmail(token, region, target.projectId, email);
      if (user) {
        record({ status: 'skipped', project: label, message: `${email} is already a member.` });
      } else {
        user = await addUserToProject(token, region, target.projectId, email, target.role || 'USER', notify);
        record({ status: 'done', project: label, message: `Invited ${email} as ${target.role || 'USER'}.` });
      }
    } catch (error) {
      record({ status: 'failed', project: label, message: error.message });
      continue;
    }

    if (!user?.id) {
      record({ status: 'failed', project: label, message: 'Trimble did not return a user id for this invite.' });
      continue;
    }

    const existingGroups = await getProjectGroups(token, region, target.projectId);

    for (const groupName of target.groupNames || []) {
      const group = existingGroups.find(
        (item) => String(item.name).toLowerCase() === String(groupName).toLowerCase(),
      );

      try {
        if (group) {
          const members = await getGroupUsers(token, region, group.id);
          if (members.some((member) => member.id === user.id)) {
            record({ status: 'skipped', project: label, message: `Already in group "${group.name}".` });
            continue;
          }
          const added = await addUserToGroup(token, region, group.id, user.id);
          record({
            status: added ? 'done' : 'failed',
            project: label,
            message: added ? `Added to group "${group.name}".` : `Could not add to group "${group.name}".`,
          });
        } else if (createMissingGroups) {
          const created = await createProjectGroup(token, region, target.projectId, groupName);
          const added = await addUserToGroup(token, region, created.id, user.id);
          record({
            status: added ? 'done' : 'failed',
            project: label,
            message: added
              ? `Created group "${groupName}" and added ${email}.`
              : `Created group "${groupName}" but could not add ${email}.`,
          });
        } else {
          record({ status: 'skipped', project: label, message: `Group "${groupName}" does not exist here.` });
        }
      } catch (error) {
        record({ status: 'failed', project: label, message: error.message });
      }
    }
  }

  Logger.info('Access grant finished', { email, steps: report.length });
  return report;
};

/**
 * Removes a person from the given projects. `mode` is 'groups' to only drop group membership,
 * or 'project' to also remove them from the project itself.
 */
export const revokeAccess = async ({ token, region, userId, targets, mode = 'project', onStep }) => {
  const report = [];
  const record = (entry) => {
    report.push(entry);
    if (onStep) onStep(entry);
    return entry;
  };

  for (const target of targets) {
    const label = target.projectName || target.projectId;

    for (const group of target.groups || []) {
      const removed = await removeUserFromGroup(token, region, group.id, userId);
      record({
        status: removed ? 'done' : 'failed',
        project: label,
        message: removed ? `Removed from group "${group.name}".` : `Could not remove from group "${group.name}".`,
      });
    }

    if (mode === 'project') {
      try {
        await removeUserFromProject(token, region, target.projectId, userId);
        record({ status: 'done', project: label, message: 'Removed from the project.' });
      } catch (error) {
        record({ status: 'failed', project: label, message: error.message });
      }
    }
  }

  Logger.info('Access revoke finished', { userId, steps: report.length });
  return report;
};

export { saveFilesToProjectRoot, saveFilesToLogsFolder } from './filesApi';

