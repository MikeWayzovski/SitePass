import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAccessProfile } from '../api/accessApi';
import { Logger } from '../utils/logger';

/**
 * Loads one person's access profile and tracks which parts of it should be applied.
 * Onboarding copies a teammate's profile; a handover copies the leaver's profile.
 * Same read, same selection model, so both flows share this hook.
 */
export const useAccessSelection = ({ getToken, region, projects, person }) => {
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [selectedCrewsBySite, setSelectedCrewsBySite] = useState({});

  const reset = useCallback(() => {
    setSites([]);
    setSelectedSiteIds([]);
    setSelectedCrewsBySite({});
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
      // Only the sites the person actually appears on are worth scanning for crews.
      const scope = person.siteIds?.length
        ? projects.filter((project) => person.siteIds.includes(project.id))
        : projects;

      const profile = await buildAccessProfile({
        token,
        region,
        projects: scope,
        userId: person.id,
        email: person.email,
      });

      setSites(profile);
      setSelectedSiteIds(profile.map((site) => site.projectId));
      setSelectedCrewsBySite(
        Object.fromEntries(profile.map((site) => [site.projectId, site.crews.map((crew) => crew.name)])),
      );
    } catch (loadError) {
      Logger.error('Could not build the access profile', loadError.message);
      setError(loadError);
      setSites([]);
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

  const toggleSite = useCallback((projectId) => {
    setSelectedSiteIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }, []);

  const toggleCrew = useCallback((projectId, crewName) => {
    setSelectedCrewsBySite((current) => {
      const chosen = current[projectId] || [];
      return {
        ...current,
        [projectId]: chosen.includes(crewName)
          ? chosen.filter((name) => name !== crewName)
          : [...chosen, crewName],
      };
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSiteIds(sites.map((site) => site.projectId));
    setSelectedCrewsBySite(
      Object.fromEntries(sites.map((site) => [site.projectId, site.crews.map((crew) => crew.name)])),
    );
  }, [sites]);

  const clearAll = useCallback(() => {
    setSelectedSiteIds([]);
    setSelectedCrewsBySite({});
  }, []);

  /** The selection shaped the way grantAccess and revokeAccess expect it. */
  const targets = useMemo(
    () =>
      sites
        .filter((site) => selectedSiteIds.includes(site.projectId))
        .map((site) => ({
          projectId: site.projectId,
          projectName: site.projectName,
          role: site.role,
          crewNames: selectedCrewsBySite[site.projectId] || [],
          crews: site.crews.filter((crew) => (selectedCrewsBySite[site.projectId] || []).includes(crew.name)),
        })),
    [sites, selectedSiteIds, selectedCrewsBySite],
  );

  const crewCount = useMemo(
    () => targets.reduce((total, target) => total + target.crewNames.length, 0),
    [targets],
  );

  return {
    sites,
    isLoading,
    error,
    selectedSiteIds,
    selectedCrewsBySite,
    toggleSite,
    toggleCrew,
    selectAll,
    clearAll,
    targets,
    crewCount,
    reload: load,
  };
};
