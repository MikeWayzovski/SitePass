import React, { useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import SectionCard from '../Modus/SectionCard';
import { useI18n } from '../../i18n/context';
import { Logger } from '../../utils/logger';
import {
  listAuditEntries,
  downloadAuditCsv,
  exportToCSV,
  stampFileName,
} from '../../utils/auditLogger';
import { saveFilesToLogsFolder } from '../../api/filesApi';
import { APP_VERSION, DOCS_URL } from '../../appInfo';

const SettingsView = ({
  settings,
  updateSetting,
  showToast,
  projects = [],
  region,
  getToken,
  embeddedProject,
  people = [],
}) => {
  const { t, language, languages, setLanguage } = useI18n();
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const auditProjectId = embeddedProject?.id || settings.auditProjectId;
  const auditProjectName =
    embeddedProject?.name || projects.find((project) => project.id === auditProjectId)?.name;

  const handleExportDiagnostics = () => {
    const exported = Logger.exportLogs();
    showToast(exported ? t('settings.logsExported') : t('settings.logsEmpty'), exported ? 'success' : 'info');
  };

  const handleClear = () => {
    Logger.clearLogs();
    showToast(t('settings.logsCleared'), 'success');
  };

  const handleDownloadCsv = () => {
    const ok = downloadAuditCsv(settings.csvSeparator);
    showToast(ok ? t('settings.auditDownloaded') : t('settings.auditEmpty'), ok ? 'success' : 'info');
  };

  const handleSnapshot = async () => {
    if (!auditProjectId) {
      showToast(t('settings.auditNeedProject'), 'warning');
      return;
    }

    setIsSavingSnapshot(true);
    try {
      const entries = listAuditEntries();
      const stamp = stampFileName('sitepass-snapshot', 'json').replace('.json', '');
      const snapshot = {
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        project: { id: auditProjectId, name: auditProjectName || '' },
        projects: projects.map((project) => ({ id: project.id, name: project.name })),
        people: people.map((person) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          projectIds: person.projectIds,
        })),
        audit: entries,
      };

      const token = await getToken();
      await saveFilesToLogsFolder(token, region, auditProjectId, [
        {
          name: `${stamp}.csv`,
          content: exportToCSV(entries, settings.csvSeparator),
          type: 'text/csv',
        },
        {
          name: `${stamp}.json`,
          content: `${JSON.stringify(snapshot, null, 2)}\n`,
          type: 'application/json',
        },
      ]);
      showToast(t('settings.auditSaved'), 'success');
    } catch (error) {
      showToast(t('settings.auditSaveFailed', { message: error.message }), 'danger');
    } finally {
      setIsSavingSnapshot(false);
    }
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
                id="settings-create-groups"
                checked={settings.createMissingGroups}
                onChange={(event) => updateSetting('createMissingGroups', event.target.checked)}
              />
              <label className="form-check-label small" htmlFor="settings-create-groups">
                {t('onboard.createMissing')}
              </label>
            </div>
          </SectionCard>
        </div>

        <div className="col-12">
          <SectionCard icon="clipboard-text" title={t('settings.auditTitle')} hint={t('settings.auditHint')}>
            <label className="form-label small text-muted" htmlFor="settings-csv-separator">
              {t('settings.csvSeparator')}
            </label>
            <select
              id="settings-csv-separator"
              className="form-select mb-3"
              style={{ maxWidth: '24rem' }}
              value={settings.csvSeparator}
              onChange={(event) => updateSetting('csvSeparator', event.target.value)}
            >
              <option value="semicolon">{t('settings.csvSemicolon')}</option>
              <option value="comma">{t('settings.csvComma')}</option>
            </select>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="settings-auto-save-audit"
                checked={settings.autoSaveAudit}
                onChange={(event) => updateSetting('autoSaveAudit', event.target.checked)}
              />
              <label className="form-check-label" htmlFor="settings-auto-save-audit">
                <span className="d-block">{t('settings.autoSave')}</span>
                <span className="d-block text-muted small">{t('settings.autoSaveHint')}</span>
              </label>
            </div>

            <label className="form-label small text-muted" htmlFor="settings-audit-project">
              {t('settings.auditProject')}
            </label>
            {embeddedProject?.id ? (
              <p className="small mb-3">
                <ModusIcon name="folder-simple" size="16px" extraClasses="me-1 text-primary" />
                <span className="fw-semibold">{embeddedProject.name || embeddedProject.id}</span>
                <span className="text-muted"> — {t('settings.usingEmbeddedProject')}</span>
              </p>
            ) : (
              <>
                <select
                  id="settings-audit-project"
                  className="form-select mb-2"
                  style={{ maxWidth: '24rem' }}
                  value={settings.auditProjectId}
                  onChange={(event) => updateSetting('auditProjectId', event.target.value)}
                >
                  <option value="">{t('settings.auditNeedProject')}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="text-muted small mb-3">{t('settings.auditProjectHint')}</p>
              </>
            )}

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                onClick={handleDownloadCsv}
              >
                <ModusIcon name="download" size="14px" />
                {t('settings.downloadCsv')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
                onClick={handleSnapshot}
                disabled={isSavingSnapshot || !auditProjectId}
              >
                {isSavingSnapshot ? (
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                ) : (
                  <ModusIcon name="upload" size="14px" />
                )}
                {isSavingSnapshot ? t('settings.snapshotWorking') : t('settings.snapshot')}
              </button>
            </div>
            <p className="text-muted small mb-0 mt-2">{t('settings.snapshotHint')}</p>
          </SectionCard>
        </div>

        <div className="col-lg-6">
          <SectionCard icon="info" title={t('settings.about')}>
            <dl className="row mb-0 small">
              <dt className="col-5 text-muted fw-normal">{t('settings.version')}</dt>
              <dd className="col-7 mb-1">v{APP_VERSION}</dd>

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
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                onClick={handleExportDiagnostics}
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
