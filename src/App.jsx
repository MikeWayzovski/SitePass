import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@trimble-oss/trimble-id-react';

import AppShell from './components/Modus/AppShell';
import ToastHost from './components/Modus/ToastHost';
import Spinner from './components/Modus/Spinner';
import EmptyState from './components/Modus/EmptyState';
import LoginScreen from './components/Auth/LoginScreen';
import OnboardView from './components/Onboarding/OnboardView';
import RelayView from './components/Relay/RelayView';
import GroupsView from './components/Groups/GroupsView';
import SettingsView from './components/Settings/SettingsView';

import { useI18n } from './i18n/context';
import { useToast } from './hooks/useToast';
import { useSettings } from './hooks/useSettings';
import { useWorkspaceApi } from './utils/useWorkspaceApi';
import { resolveAccessToken, isTokenUnavailable, clearCachedToken } from './utils/accessToken';
import { isTidConfigured } from './api/client';
import { getProjects } from './api/projectsApi';
import { getCurrentUser } from './api/usersApi';
import { listPeopleAcrossProjects } from './api/accessApi';
import { Logger } from './utils/logger';

/** People are scanned across the most recently touched sites; a full account scan is too slow. */
const PEOPLE_SCAN_LIMIT = 12;

const byRecency = (a, b) =>
  new Date(b.lastVisitedOn || b.modifiedOn || 0) - new Date(a.lastVisitedOn || a.modifiedOn || 0);

function App() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, loginWithRedirect, logout, error: authError } =
    useAuth();
  const { isEmbedded, workspaceApi, embeddedToken } = useWorkspaceApi();

  const { settings, updateSetting } = useSettings();
  const { toasts, showToast, dismissToast } = useToast();

  const [activeView, setActiveView] = useState('onboard');
  const [currentUser, setCurrentUser] = useState(null);

  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const [people, setPeople] = useState([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);

  const hasAccess = isAuthenticated || (isEmbedded && Boolean(embeddedToken));
  const region = settings.region;

  const getToken = useCallback(
    () =>
      resolveAccessToken({
        isAuthenticated,
        getAccessTokenSilently,
        isEmbedded,
        embeddedToken,
        workspaceApi,
      }),
    [isAuthenticated, getAccessTokenSilently, isEmbedded, embeddedToken, workspaceApi],
  );

  const reportError = useCallback(
    (error, fallbackMessage) => {
      if (isTokenUnavailable(error)) {
        showToast(t('auth.needsSignIn'), 'warning');
        return;
      }
      showToast(fallbackMessage || t('errors.generic', { message: error.message }), 'danger');
    },
    [showToast, t],
  );

  const loadProjects = useCallback(async () => {
    if (!hasAccess) return;

    setIsLoadingProjects(true);
    setProjectsError(null);

    try {
      const token = await getToken();
      const loaded = await getProjects(token, region);
      setProjects(loaded);
      if (loaded.length === 0) showToast(t('errors.noProjects'), 'info');
    } catch (error) {
      Logger.error('Could not load projects', error.message);
      setProjects([]);
      setProjectsError(error);
      reportError(error, t('errors.projects'));
    } finally {
      setIsLoadingProjects(false);
    }
  }, [hasAccess, getToken, region, showToast, reportError, t]);

  useEffect(() => {
    // Fetch-on-dependency-change: the loading flag has to flip before the request starts,
    // which the compiler lint cannot distinguish from derivable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, [loadProjects]);

  // Identify the signed-in user once a token exists, for the header menu.
  useEffect(() => {
    if (!hasAccess) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const profile = await getCurrentUser(token);
        if (!cancelled) setCurrentUser(profile);
      } catch (error) {
        Logger.warn('Could not identify the signed-in user', error.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasAccess, getToken]);

  const scanScope = useMemo(
    () => [...projects].sort(byRecency).slice(0, PEOPLE_SCAN_LIMIT),
    [projects],
  );

  // The people list powers both flows, so it loads once per region instead of per view.
  useEffect(() => {
    if (scanScope.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPeople([]);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingPeople(true);

    (async () => {
      try {
        const token = await getToken();
        const found = await listPeopleAcrossProjects(token, region, scanScope);
        if (!cancelled) setPeople(found);
      } catch (error) {
        Logger.error('Could not load people', error.message);
        if (!cancelled) {
          setPeople([]);
          reportError(error);
        }
      } finally {
        if (!cancelled) setIsLoadingPeople(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanScope, region, getToken, reportError]);

  const handleSignOut = useCallback(() => {
    clearCachedToken();
    if (typeof logout === 'function') logout();
  }, [logout]);

  const callbackPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isAuthCallback =
    callbackPath === '/callback' && Boolean(new URLSearchParams(window.location.search).get('code'));

  if (!isEmbedded && !isAuthenticated) {
    return (
      <LoginScreen
        isLoading={isAuthLoading}
        isCallback={isAuthCallback}
        isConfigured={isTidConfigured}
        error={authError?.message}
        onLogin={() => loginWithRedirect()}
      />
    );
  }

  const sharedProps = {
    projects,
    people,
    isLoadingPeople,
    region,
    getToken,
    defaults: settings,
    showToast,
  };

  const renderView = () => {
    if (activeView === 'settings') {
      return <SettingsView settings={settings} updateSetting={updateSetting} showToast={showToast} />;
    }

    if (isLoadingProjects) {
      return (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <Spinner label={t('loading.projects')} />
          </div>
        </div>
      );
    }

    if (projectsError || projects.length === 0) {
      return (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <EmptyState
              icon={projectsError ? 'warning' : 'hard-hat'}
              title={projectsError ? t('errors.title') : undefined}
              body={projectsError ? t('errors.projects') : t('errors.noProjects')}
              action={
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadProjects}>
                  {t('common.retry')}
                </button>
              }
            />
          </div>
        </div>
      );
    }

    if (activeView === 'replace') return <RelayView {...sharedProps} />;
    if (activeView === 'groups') return <GroupsView projects={projects} region={region} getToken={getToken} />;
    return <OnboardView {...sharedProps} />;
  };

  return (
    <>
      <AppShell
        activeView={activeView}
        onNavigate={setActiveView}
        region={region}
        onRegionChange={(next) => updateSetting('region', next)}
        regionLocked={isLoadingProjects}
        user={currentUser}
        onSignOut={isEmbedded ? null : handleSignOut}
      >
        {renderView()}
      </AppShell>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
