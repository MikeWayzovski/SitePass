import React from 'react';
import ModusIcon from '../Modus/ModusIcon';
import SectionCard from '../Modus/SectionCard';
import { useI18n } from '../../i18n/context';
import { Logger } from '../../utils/logger';
import { APP_VERSION, DOCS_URL } from '../../appInfo';

const SettingsView = ({ settings, updateSetting, showToast }) => {
  const { t, language, languages, setLanguage } = useI18n();

  const handleExport = () => {
    const exported = Logger.exportLogs();
    showToast(exported ? t('settings.logsExported') : t('settings.logsEmpty'), exported ? 'success' : 'info');
  };

  const handleClear = () => {
    Logger.clearLogs();
    showToast(t('settings.logsCleared'), 'success');
  };

  return (
    <div className="d-flex flex-column gap-3">
      <header>
        <h1 className="h4 fw-bold mb-1">{t('settings.title')}</h1>
        <p className="text-muted mb-0">{t('settings.subtitle')}</p>
      </header>

      <div className="row g-3">
        <div className="col-lg-6">
          <SectionCard icon="globe" title={t('settings.language')} hint={t('settings.languageHint')}>
            <select
              className="form-select"
              value={language}
              aria-label={t('settings.language')}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </SectionCard>
        </div>

        <div className="col-lg-6">
          <SectionCard icon="gear" title={t('settings.defaults')}>
            <label className="form-label small text-muted" htmlFor="settings-role">
              {t('settings.defaultRole')}
            </label>
            <select
              id="settings-role"
              className="form-select mb-3"
              value={settings.role}
              onChange={(event) => updateSetting('role', event.target.value)}
            >
              <option value="USER">{t('common.roleUser')}</option>
              <option value="ADMIN">{t('common.roleAdmin')}</option>
            </select>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="settings-notify"
                checked={settings.notify}
                onChange={(event) => updateSetting('notify', event.target.checked)}
              />
              <label className="form-check-label small" htmlFor="settings-notify">
                {t('onboard.notify')}
              </label>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="settings-create-crews"
                checked={settings.createMissingCrews}
                onChange={(event) => updateSetting('createMissingCrews', event.target.checked)}
              />
              <label className="form-check-label small" htmlFor="settings-create-crews">
                {t('onboard.createMissing')}
              </label>
            </div>
          </SectionCard>
        </div>

        <div className="col-lg-6">
          <SectionCard icon="info" title={t('settings.about')}>
            <dl className="row mb-0 small">
              <dt className="col-5 text-muted fw-normal">{t('settings.version')}</dt>
              <dd className="col-7 mb-1">{APP_VERSION}</dd>

              <dt className="col-5 text-muted fw-normal">{t('settings.documentation')}</dt>
              <dd className="col-7 mb-0">
                <a href={DOCS_URL} target="_blank" rel="noreferrer" className="d-inline-flex align-items-center gap-1">
                  README
                  <ModusIcon name="arrow-square-out" size="14px" />
                </a>
              </dd>
            </dl>
          </SectionCard>
        </div>

        <div className="col-lg-6">
          <SectionCard icon="clipboard-text" title={t('settings.diagnostics')}>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
                {t('settings.clearLogs')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
                onClick={handleExport}
              >
                <ModusIcon name="clipboard-text" size="14px" />
                {t('settings.exportLogs')}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
