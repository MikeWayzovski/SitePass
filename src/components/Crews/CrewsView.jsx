import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import Spinner from '../Modus/Spinner';
import EmptyState from '../Modus/EmptyState';
import PersonAvatar from '../Modus/PersonAvatar';
import CopyableText from '../Modus/CopyableText';
import { useI18n } from '../../i18n/context';
import { getCrewsByProject, getGroupUsers } from '../../api/groupsApi';
import { fullName } from '../../api/accessApi';
import { Logger } from '../../utils/logger';

const CrewRow = ({ crew, region, getToken }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next || members) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      setMembers(await getGroupUsers(token, region, crew.id));
    } catch (error) {
      Logger.warn(`Could not load members of crew ${crew.name}`, error.message);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <li className="list-group-item px-3">
      <button
        type="button"
        className="btn btn-link text-decoration-none text-body p-0 d-flex align-items-center gap-2 w-100 text-start"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <ModusIcon name={isOpen ? 'caret-down' : 'caret-right'} size="16px" extraClasses="text-muted flex-shrink-0" />
        <ModusIcon name="users-four" size="18px" extraClasses="text-secondary flex-shrink-0" />
        <span className="text-truncate flex-grow-1">{crew.name}</span>
        {members ? (
          <span className="badge text-bg-secondary flex-shrink-0">
            {t('common.member', { count: members.length })}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="ps-4 pt-2">
          {isLoading ? (
            <Spinner label={t('common.loading')} small />
          ) : members && members.length > 0 ? (
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {members.map((member) => (
                <li key={member.id} className="d-flex align-items-center gap-2">
                  <PersonAvatar person={member} size={28} />
                  <span className="d-flex flex-column min-w-0">
                    <CopyableText value={fullName(member)} className="small fw-semibold" />
                    <CopyableText value={member.email} className="text-muted small" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small mb-0">{t('crews.noMembers')}</p>
          )}
        </div>
      ) : null}
    </li>
  );
};

const CrewsView = ({ projects, region, getToken }) => {
  const { t } = useI18n();
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const token = await getToken();
      setSites(await getCrewsByProject(token, region, projects, setProgress));
    } catch (loadError) {
      Logger.error('Could not load crews', loadError.message);
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, region, projects]);

  useEffect(() => {
    // See useAccessSelection: the loading flag has to flip before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const withCrews = sites.filter((site) => site.crews.length > 0);
    if (!needle) return withCrews;

    return withCrews
      .map((site) => ({
        ...site,
        crews: site.projectName.toLowerCase().includes(needle)
          ? site.crews
          : site.crews.filter((crew) => String(crew.name).toLowerCase().includes(needle)),
      }))
      .filter((site) => site.crews.length > 0);
  }, [sites, query]);

  return (
    <div className="d-flex flex-column gap-3">
      <header className="d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <h1 className="h4 fw-bold mb-1">{t('crews.title')}</h1>
          <p className="text-muted mb-0">{t('crews.subtitle')}</p>
        </div>

        <div className="input-group input-group-sm" style={{ maxWidth: '20rem' }}>
          <span className="input-group-text bg-body">
            <ModusIcon name="magnifying-glass" size="16px" extraClasses="text-muted" />
          </span>
          <input
            type="search"
            className="form-control"
            placeholder={t('crews.filter')}
            aria-label={t('crews.filter')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <Spinner label={`${t('loading.crews')} ${progress}%`} small />
            <div className="progress mt-3" style={{ height: '0.35rem' }}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <EmptyState
              icon="warning"
              title={t('errors.title')}
              body={error.message}
              action={
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={load}>
                  {t('common.retry')}
                </button>
              }
            />
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <EmptyState icon="users-four" body={t('crews.emptyAll')} />
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {matches.map((site) => (
            <div className="col-xl-6" key={site.projectId}>
              <section className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent d-flex align-items-center gap-2">
                  <ModusIcon name="hard-hat" size="20px" extraClasses="text-primary flex-shrink-0" />
                  <h2 className="h6 mb-0 text-truncate" title={site.projectName}>
                    {site.projectName}
                  </h2>
                  <span className="badge text-bg-secondary ms-auto flex-shrink-0">
                    {t('common.crew', { count: site.crews.length })}
                  </span>
                </div>
                <ul className="list-group list-group-flush">
                  {site.crews.map((crew) => (
                    <CrewRow key={crew.id} crew={crew} region={region} getToken={getToken} />
                  ))}
                </ul>
              </section>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrewsView;
