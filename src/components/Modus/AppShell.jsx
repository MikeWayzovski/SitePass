import React from 'react';
import ModusIcon from './ModusIcon';
import UserMenu from '../Auth/UserMenu';
import { useI18n } from '../../i18n/context';
import { REGIONS } from '../../api/config';
import { APP_VERSION } from '../../appInfo';

const NAV_ITEMS = [
  { id: 'onboard', icon: 'user-plus', labelKey: 'nav.onboard', hintKey: 'nav.onboardHint' },
  { id: 'replace', icon: 'user-switch', labelKey: 'nav.replace', hintKey: 'nav.replaceHint' },
  { id: 'groups', icon: 'users-four', labelKey: 'nav.groups', hintKey: 'nav.groupsHint' },
  { id: 'settings', icon: 'gear', labelKey: 'nav.settings', hintKey: 'nav.settingsHint' },
];

const AppShell = ({
  activeView,
  onNavigate,
  region,
  onRegionChange,
  regionLocked,
  user,
  onSignOut,
  children,
}) => {
  const { t } = useI18n();

  return (
    <div className="d-flex flex-column min-vh-100 bg-body-secondary">
      <header className="navbar navbar-expand bg-body border-bottom px-3 py-2 flex-shrink-0">
        <span className="navbar-brand d-flex align-items-center gap-2 me-auto mb-0">
          <ModusIcon name="shield-check" size="26px" extraClasses="text-primary" />
          <span className="fw-bold">{t('app.name')}</span>
          <span className="d-none d-lg-inline text-muted small fw-normal">{t('app.tagline')}</span>
        </span>

        <div className="d-flex align-items-center gap-2">
          <label className="visually-hidden" htmlFor="region-select">
            {t('common.region')}
          </label>
          <select
            id="region-select"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={region}
            onChange={(event) => onRegionChange(event.target.value)}
            disabled={regionLocked}
            title={t('common.region')}
          >
            {REGIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(`regions.${option.id}`)}
              </option>
            ))}
          </select>

          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </header>

      <div className="d-flex flex-grow-1 min-h-0">
        <nav className="bg-body border-end d-none d-md-flex flex-column p-2 flex-shrink-0" style={{ width: '14rem' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn text-start d-flex align-items-center gap-2 mb-1 ${
                activeView === item.id ? 'btn-primary' : 'btn-link text-body text-decoration-none'
              }`}
              onClick={() => onNavigate(item.id)}
              aria-current={activeView === item.id ? 'page' : undefined}
              title={t(item.hintKey)}
            >
              <ModusIcon name={item.icon} size="20px" extraClasses="flex-shrink-0" />
              <span className="text-truncate">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <main className="flex-grow-1 min-w-0 overflow-auto p-3 p-lg-4">
          <div className="mx-auto" style={{ maxWidth: '80rem' }}>
            {children}
          </div>
        </main>
      </div>

      <nav className="d-flex d-md-none bg-body border-top flex-shrink-0">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn btn-link flex-fill text-decoration-none d-flex flex-column align-items-center gap-1 py-2 ${
              activeView === item.id ? 'text-primary fw-semibold' : 'text-body'
            }`}
            onClick={() => onNavigate(item.id)}
            aria-current={activeView === item.id ? 'page' : undefined}
          >
            <ModusIcon name={item.icon} size="20px" />
            <span className="small">{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      <footer className="bg-body border-top px-3 py-2 d-none d-md-flex justify-content-between align-items-center flex-shrink-0 small text-muted">
        <span>{t('app.name')}</span>
        <span>v{APP_VERSION}</span>
      </footer>
    </div>
  );
};

export default AppShell;
