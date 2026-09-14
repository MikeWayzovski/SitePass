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
 * annotated with the sites they appear on. This is the people picker behind every SitePass flow.
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
          existing.siteIds.push(project.id);
          return;
        }

        byId.set(user.id, {
          ...user,
          name: fullName(user),
          siteIds: [project.id],
        });
      });
    },
    onProgress,
  );

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Reads what one person can actually reach: their role per project plus crew membership.
 * `projects` should already be narrowed to the sites worth scanning, since each one costs calls.
 */
export const buildAccessProfile = async ({ token, region, projects, userId, email, onProgress }) => {
  const sites = [];

  await runInBatches(
    projects,
    async (project) => {
      const members = await getProjectUsers(token, region, project.id);
      const match = members.find((member) =>
        userId ? member.id === userId : String(member.email || '').toLowerCase() === String(email || '').toLowerCase(),
      );
      if (!match) return;

      const groups = await getProjectGroups(token, region, project.id);
      const crews = [];

      for (const group of groups) {
        const groupUsers = await getGroupUsers(token, region, group.id);
        if (groupUsers.some((groupUser) => groupUser.id === match.id)) {
          crews.push({ id: group.id, name: group.name });
        }
      }

      sites.push({
        projectId: project.id,
        projectName: project.name || 'Untitled project',
        userId: match.id,
        role: match.role || 'USER',
        crews: crews.sort((a, b) => String(a.name).localeCompare(String(b.name))),
      });
    },
    onProgress,
  );

  return sites.sort((a, b) => a.projectName.localeCompare(b.projectName));
};

/**
 * Grants access. `targets` is [{ projectId, projectName, role, crewNames: [] }].
 * Crews are matched by name so a template from one site can be applied to another.
 * Returns a per-step report instead of throwing, so partial success stays visible.
 */
export const grantAccess = async ({
  token,
  region,
  email,
  targets,
  notify = true,
  createMissingCrews = true,
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
        record({ status: 'skipped', site: label, message: `${email} is already a member.` });
      } else {
        user = await addUserToProject(token, region, target.projectId, email, target.role || 'USER', notify);
        record({ status: 'done', site: label, message: `Invited ${email} as ${target.role || 'USER'}.` });
      }
    } catch (error) {
      record({ status: 'failed', site: label, message: error.message });
      continue;
    }

    if (!user?.id) {
      record({ status: 'failed', site: label, message: 'Trimble did not return a user id for this invite.' });
      continue;
    }

    const existingCrews = await getProjectGroups(token, region, target.projectId);

    for (const crewName of target.crewNames || []) {
      const crew = existingCrews.find(
        (group) => String(group.name).toLowerCase() === String(crewName).toLowerCase(),
      );

      try {
        if (crew) {
          const members = await getGroupUsers(token, region, crew.id);
          if (members.some((member) => member.id === user.id)) {
            record({ status: 'skipped', site: label, message: `Already in crew "${crew.name}".` });
            continue;
          }
          const added = await addUserToGroup(token, region, crew.id, user.id);
          record({
            status: added ? 'done' : 'failed',
            site: label,
            message: added ? `Added to crew "${crew.name}".` : `Could not add to crew "${crew.name}".`,
          });
        } else if (createMissingCrews) {
          const created = await createProjectGroup(token, region, target.projectId, crewName);
          const added = await addUserToGroup(token, region, created.id, user.id);
          record({
            status: added ? 'done' : 'failed',
            site: label,
            message: added
              ? `Created crew "${crewName}" and added ${email}.`
              : `Created crew "${crewName}" but could not add ${email}.`,
          });
        } else {
          record({ status: 'skipped', site: label, message: `Crew "${crewName}" does not exist here.` });
        }
      } catch (error) {
        record({ status: 'failed', site: label, message: error.message });
      }
    }
  }

  Logger.info('Access grant finished', { email, steps: report.length });
  return report;
};

/**
 * Removes a person from the given sites. `mode` is 'crews' to only drop crew membership,
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

    for (const crew of target.crews || []) {
      const removed = await removeUserFromGroup(token, region, crew.id, userId);
      record({
        status: removed ? 'done' : 'failed',
        site: label,
        message: removed ? `Removed from crew "${crew.name}".` : `Could not remove from crew "${crew.name}".`,
      });
    }

    if (mode === 'project') {
      try {
        await removeUserFromProject(token, region, target.projectId, userId);
        record({ status: 'done', site: label, message: 'Removed from the project.' });
      } catch (error) {
        record({ status: 'failed', site: label, message: error.message });
      }
    }
  }

  Logger.info('Access revoke finished', { userId, steps: report.length });
  return report;
};
