import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAccessProfile } from '../api/accessApi';
import { Logger } from '../utils/logger';

/**
 * Loads one person's access profile and tracks which parts of it should be applied.
 * Onboarding copies a teammate's profile; a handover copies the leaver's profile.
 * Same read, same selection model, so both flows share this hook.
 */
export const useAccessSelection = ({ getToken, region, projects, person }) => {
  const [profile, setProfile] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedGroupsByProject, setSelectedGroupsByProject] = useState({});

  const reset = useCallback(() => {
    setProfile([]);
    setSelectedProjectIds([]);
    setSelectedGroupsByProject({});
    setError(null);
  }, []);

  const load = useCallback(async () => {
    if (!person) {
      reset();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      // Only the projects the person actually appears on are worth scanning for groups.
      const scope = person.projectIds?.length
        ? projects.filter((project) => person.projectIds.includes(project.id))
        : projects;

      const loaded = await buildAccessProfile({
        token,
        region,
        projects: scope,
        userId: person.id,
        email: person.email,
      });

      setProfile(loaded);
      setSelectedProjectIds(loaded.map((entry) => entry.projectId));
      setSelectedGroupsByProject(
        Object.fromEntries(loaded.map((entry) => [entry.projectId, entry.groups.map((group) => group.name)])),
      );
    } catch (loadError) {
      Logger.error('Could not build the access profile', loadError.message);
      setError(loadError);
      setProfile([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, region, projects, person, reset]);

  useEffect(() => {
    // Fetch-on-dependency-change: the loading flag has to flip before the request starts,
    // which the compiler lint cannot distinguish from derivable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const toggleProject = useCallback((projectId) => {
    setSelectedProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }, []);

  const toggleGroup = useCallback((projectId, groupName) => {
    setSelectedGroupsByProject((current) => {
      const chosen = current[projectId] || [];
      return {
        ...current,
        [projectId]: chosen.includes(groupName)
          ? chosen.filter((name) => name !== groupName)
          : [...chosen, groupName],
      };
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedProjectIds(profile.map((entry) => entry.projectId));
    setSelectedGroupsByProject(
      Object.fromEntries(profile.map((entry) => [entry.projectId, entry.groups.map((group) => group.name)])),
    );
  }, [profile]);

  const clearAll = useCallback(() => {
    setSelectedProjectIds([]);
    setSelectedGroupsByProject({});
  }, []);

  /** The selection shaped the way grantAccess and revokeAccess expect it. */
  const targets = useMemo(
    () =>
      profile
        .filter((entry) => selectedProjectIds.includes(entry.projectId))
        .map((entry) => ({
          projectId: entry.projectId,
          projectName: entry.projectName,
          role: entry.role,
          groupNames: selectedGroupsByProject[entry.projectId] || [],
          groups: entry.groups.filter((group) =>
            (selectedGroupsByProject[entry.projectId] || []).includes(group.name),
          ),
        })),
    [profile, selectedProjectIds, selectedGroupsByProject],
  );

  const groupCount = useMemo(
    () => targets.reduce((total, target) => total + target.groupNames.length, 0),
    [targets],
  );

  return {
    projects: profile,
    isLoading,
    error,
    selectedProjectIds,
    selectedGroupsByProject,
    toggleProject,
    toggleGroup,
    selectAll,
    clearAll,
    targets,
    groupCount,
    reload: load,
  };
};
