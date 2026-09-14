import React from 'react';
import ModusIcon from './ModusIcon';
import EmptyState from './EmptyState';
import { useI18n } from '../../i18n/context';

/**
 * The shared "what gets granted" surface: one row per site, crew checkboxes underneath.
 * Both onboarding and handover render the same shape so the decision looks identical.
 */
const AccessMatrix = ({
  sites,
  selectedSiteIds,
  selectedCrewsBySite,
  onToggleSite,
  onToggleCrew,
  onSelectAll,
  onClearAll,
  disabled = false,
  emptyBody,
}) => {
  const { t } = useI18n();

  if (sites.length === 0) return <EmptyState icon="hard-hat" body={emptyBody} />;

  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-2">
        <button
          type="button"
          className="btn btn-sm btn-link text-decoration-none p-0"
          onClick={onSelectAll}
          disabled={disabled}
        >
          {t('common.selectAll')}
        </button>
        <span className="text-muted small">·</span>
        <button
          type="button"
          className="btn btn-sm btn-link text-decoration-none p-0"
          onClick={onClearAll}
          disabled={disabled}
        >
          {t('common.clear')}
        </button>
      </div>

      <div className="d-flex flex-column gap-2">
        {sites.map((site) => {
          const siteChecked = selectedSiteIds.includes(site.projectId);
          const chosenCrews = selectedCrewsBySite[site.projectId] || [];

          return (
            <div
              key={site.projectId}
              className={`border rounded p-3 ${siteChecked ? 'border-primary bg-primary-subtle bg-opacity-10' : ''}`}
            >
              <div className="form-check d-flex align-items-center gap-2 mb-0">
                <input
                  className="form-check-input mt-0 flex-shrink-0"
                  type="checkbox"
                  id={`site-${site.projectId}`}
                  checked={siteChecked}
                  onChange={() => onToggleSite(site.projectId)}
                  disabled={disabled}
                />
                <label
                  className="form-check-label d-flex align-items-center gap-2 min-w-0 flex-grow-1"
                  htmlFor={`site-${site.projectId}`}
                >
                  <ModusIcon name="hard-hat" size="18px" extraClasses="text-primary flex-shrink-0" />
                  <span className="fw-semibold text-truncate">{site.projectName}</span>
                </label>
                <span className="badge text-bg-secondary flex-shrink-0">
                  {t('common.crew', { count: site.crews.length })}
                </span>
              </div>

              {site.crews.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 mt-3 ps-4">
                  {site.crews.map((crew) => {
                    const crewId = `crew-${site.projectId}-${crew.id}`;
                    return (
                      <div className="form-check form-check-inline me-0" key={crew.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={crewId}
                          checked={chosenCrews.includes(crew.name)}
                          onChange={() => onToggleCrew(site.projectId, crew.name)}
                          disabled={disabled || !siteChecked}
                        />
                        <label className="form-check-label small d-inline-flex align-items-center gap-1" htmlFor={crewId}>
                          <ModusIcon name="users-four" size="14px" extraClasses="text-secondary" />
                          {crew.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccessMatrix;
