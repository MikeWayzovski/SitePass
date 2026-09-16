import React from 'react';
import ModusIcon from './ModusIcon';
import EmptyState from './EmptyState';
import { useI18n } from '../../i18n/context';

/**
 * The shared "what gets granted" surface: one row per project, group checkboxes underneath.
 * Both onboarding and handover render the same shape so the decision looks identical.
 */
const AccessMatrix = ({
  projects,
  selectedProjectIds,
  selectedGroupsByProject,
  onToggleProject,
  onToggleGroup,
  onSelectAll,
  onClearAll,
  disabled = false,
  emptyBody,
}) => {
  const { t } = useI18n();

  if (projects.length === 0) return <EmptyState icon="hard-hat" body={emptyBody} />;

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
        {projects.map((entry) => {
          const projectChecked = selectedProjectIds.includes(entry.projectId);
          const chosenGroups = selectedGroupsByProject[entry.projectId] || [];

          return (
            <div
              key={entry.projectId}
              className={`border rounded p-3 ${projectChecked ? 'border-primary bg-primary-subtle bg-opacity-10' : ''}`}
            >
              <div className="form-check d-flex align-items-center gap-2 mb-0">
                <input
                  className="form-check-input mt-0 flex-shrink-0"
                  type="checkbox"
                  id={`project-${entry.projectId}`}
                  checked={projectChecked}
                  onChange={() => onToggleProject(entry.projectId)}
                  disabled={disabled}
                />
                <label
                  className="form-check-label d-flex align-items-center gap-2 min-w-0 flex-grow-1"
                  htmlFor={`project-${entry.projectId}`}
                >
                  <ModusIcon name="hard-hat" size="18px" extraClasses="text-primary flex-shrink-0" />
                  <span className="fw-semibold text-truncate">{entry.projectName}</span>
                </label>
                <span className="badge text-bg-secondary flex-shrink-0">
                  {t('common.group', { count: entry.groups.length })}
                </span>
              </div>

              {entry.groups.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 mt-3 ps-4">
                  {entry.groups.map((group) => {
                    const groupId = `group-${entry.projectId}-${group.id}`;
                    return (
                      <div className="form-check form-check-inline me-0" key={group.id}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={groupId}
                          checked={chosenGroups.includes(group.name)}
                          onChange={() => onToggleGroup(entry.projectId, group.name)}
                          disabled={disabled || !projectChecked}
                        />
                        <label className="form-check-label small d-inline-flex align-items-center gap-1" htmlFor={groupId}>
                          <ModusIcon name="users-four" size="14px" extraClasses="text-secondary" />
                          {group.name}
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
