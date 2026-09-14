import React from 'react';
import ModusIcon from './ModusIcon';
import { useI18n } from '../../i18n/context';

const STATUS_STYLE = {
  done: { icon: 'check', className: 'text-success' },
  skipped: { icon: 'info', className: 'text-secondary' },
  failed: { icon: 'warning', className: 'text-danger' },
};

/**
 * Shows every step the API actually performed. Partial failures are normal when a site
 * has stricter permissions, so the run reports instead of throwing away the whole batch.
 */
const ProgressReport = ({ report, isRunning }) => {
  const { t } = useI18n();
  if (report.length === 0 && !isRunning) return null;

  const counts = report.reduce(
    (totals, entry) => ({ ...totals, [entry.status]: (totals[entry.status] || 0) + 1 }),
    {},
  );
  const failed = counts.failed || 0;

  return (
    <div className="border rounded p-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        {isRunning ? <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" /> : null}
        <h3 className="h6 fw-bold mb-0">{t('progress.title')}</h3>
        <span className="text-muted small ms-auto">
          {t('progress.summary', {
            done: counts.done || 0,
            skipped: counts.skipped || 0,
            failed,
          })}
        </span>
      </div>

      {!isRunning && report.length > 0 ? (
        <p className={`small mb-2 ${failed ? 'text-danger' : 'text-success'}`}>
          {failed ? t('progress.someFailed') : t('progress.allGood')}
        </p>
      ) : null}

      <ul className="list-unstyled mb-0 overflow-auto" style={{ maxHeight: '14rem' }}>
        {report.map((entry, index) => {
          const style = STATUS_STYLE[entry.status] || STATUS_STYLE.skipped;
          return (
            <li key={`${entry.site}-${index}`} className="d-flex align-items-start gap-2 py-1 small">
              <ModusIcon name={style.icon} size="16px" extraClasses={`${style.className} flex-shrink-0 mt-1`} />
              <span className="min-w-0">
                <span className="fw-semibold">{entry.site}</span>
                <span className="text-muted"> — {entry.message}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProgressReport;
