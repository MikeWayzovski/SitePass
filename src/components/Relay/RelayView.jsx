import React, { useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import SectionCard from '../Modus/SectionCard';
import PersonPicker from '../Modus/PersonPicker';
import PersonAvatar from '../Modus/PersonAvatar';
import CopyableText from '../Modus/CopyableText';
import AccessMatrix from '../Modus/AccessMatrix';
import ConfirmModal from '../Modus/ConfirmModal';
import ProgressReport from '../Modus/ProgressReport';
import Spinner from '../Modus/Spinner';
import { useI18n } from '../../i18n/context';
import { useAccessSelection } from '../../hooks/useAccessSelection';
import { grantAccess, revokeAccess } from '../../api/accessApi';
import { Logger } from '../../utils/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LEAVER_OPTIONS = [
  { id: 'keep', labelKey: 'replace.keepAccess', hintKey: 'replace.keepAccessHint' },
  { id: 'crews', labelKey: 'replace.removeCrews', hintKey: 'replace.removeCrewsHint' },
  { id: 'project', labelKey: 'replace.removeAll', hintKey: 'replace.removeAllHint' },
];

const RelayView = ({ projects, people, isLoadingPeople, region, getToken, defaults, showToast }) => {
  const { t } = useI18n();

  const [leaver, setLeaver] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [leaverAction, setLeaverAction] = useState('keep');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState([]);

  const selection = useAccessSelection({ getToken, region, projects, person: leaver });

  const isSamePerson =
    Boolean(leaver) && String(leaver.email || '').toLowerCase() === email.trim().toLowerCase();
  const canSubmit =
    Boolean(leaver) &&
    EMAIL_PATTERN.test(email) &&
    !isSamePerson &&
    selection.targets.length > 0 &&
    !isRunning &&
    !selection.isLoading;

  const handleOpenConfirm = () => {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(t('onboard.invalidEmail'));
      return;
    }
    if (isSamePerson) {
      setEmailError(t('replace.sameUser'));
      return;
    }
    if (selection.targets.length === 0) {
      showToast(t('onboard.nothingSelected'), 'warning');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleRelay = async () => {
    setIsConfirmOpen(false);
    setIsRunning(true);
    setReport([]);

    const appendStep = (entry) => setReport((current) => [...current, entry]);

    try {
      const token = await getToken();

      // Grant first: if the handover fails halfway the site never loses its last holder.
      const granted = await grantAccess({
        token,
        region,
        email,
        targets: selection.targets,
        notify: defaults.notify,
        createMissingCrews: defaults.createMissingCrews,
        onStep: appendStep,
      });

      const grantFailed = granted.some((entry) => entry.status === 'failed');

      if (leaverAction !== 'keep' && !grantFailed) {
        await revokeAccess({
          token,
          region,
          userId: leaver.id,
          targets: selection.targets,
          mode: leaverAction,
          onStep: appendStep,
        });
      } else if (leaverAction !== 'keep' && grantFailed) {
        appendStep({
          status: 'skipped',
          site: leaver.name,
          message: t('replace.keptAfterFailure'),
        });
      }

      showToast(
        grantFailed
          ? t('progress.someFailed')
          : t('replace.successBody', { to: email, count: selection.targets.length }),
        grantFailed ? 'warning' : 'success',
      );
    } catch (error) {
      Logger.error('Handover failed', error.message);
      showToast(t('errors.generic', { message: error.message }), 'danger');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      <header>
        <h1 className="h4 fw-bold mb-1">{t('replace.title')}</h1>
        <p className="text-muted mb-0">{t('replace.subtitle')}</p>
      </header>

      <div className="row g-3">
        <div className="col-lg-5">
          <SectionCard step={1} title={t('replace.step1')} hint={t('replace.step1Hint')} className="h-100">
            <PersonPicker
              people={people}
              isLoading={isLoadingPeople}
              selectedId={leaver?.id}
              onSelect={setLeaver}
              emptyBody={t('errors.noProjects')}
            />

            {leaver ? (
              <div className="d-flex align-items-center gap-3 border rounded p-3 mt-3 bg-body-secondary">
                <PersonAvatar person={leaver} size={44} />
                <div className="min-w-0">
                  <CopyableText value={leaver.name} className="fw-semibold" />
                  <CopyableText value={leaver.email} className="text-muted small" />
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="col-lg-7 d-flex flex-column gap-3">
          <SectionCard step={2} title={t('replace.step2')} hint={t('replace.step2Hint')}>
            <label className="form-label small text-muted" htmlFor="relay-email">
              {t('common.email')}
            </label>
            <input
              id="relay-email"
              type="email"
              className={`form-control ${emailError ? 'is-invalid' : ''}`}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError('');
              }}
              onBlur={() =>
                setEmailError(email && !EMAIL_PATTERN.test(email) ? t('onboard.invalidEmail') : '')
              }
              placeholder="name@company.com"
              disabled={isRunning}
            />
            {emailError ? <div className="invalid-feedback">{emailError}</div> : null}
          </SectionCard>

          <SectionCard step={3} title={t('replace.step3')}>
            {selection.isLoading ? (
              <Spinner label={t('loading.access')} small />
            ) : (
              <AccessMatrix
                sites={selection.sites}
                selectedSiteIds={selection.selectedSiteIds}
                selectedCrewsBySite={selection.selectedCrewsBySite}
                onToggleSite={selection.toggleSite}
                onToggleCrew={selection.toggleCrew}
                onSelectAll={selection.selectAll}
                onClearAll={selection.clearAll}
                disabled={isRunning}
                emptyBody={t('replace.step1Hint')}
              />
            )}
          </SectionCard>

          <SectionCard step={4} title={t('replace.step4')}>
            <div className="d-flex flex-column gap-2">
              {LEAVER_OPTIONS.map((option) => (
                <div className="form-check" key={option.id}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="leaver-action"
                    id={`leaver-${option.id}`}
                    checked={leaverAction === option.id}
                    onChange={() => setLeaverAction(option.id)}
                    disabled={isRunning}
                  />
                  <label className="form-check-label" htmlFor={`leaver-${option.id}`}>
                    <span className="d-block">{t(option.labelKey)}</span>
                    <span className="d-block text-muted small">{t(option.hintKey)}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={handleOpenConfirm}
                disabled={!canSubmit}
              >
                {isRunning ? (
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                ) : (
                  <ModusIcon name="user-switch" size="18px" />
                )}
                {isRunning ? t('common.working') : t('replace.submit')}
              </button>
            </div>
          </SectionCard>

          {report.length > 0 || isRunning ? <ProgressReport report={report} isRunning={isRunning} /> : null}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={t('replace.confirmTitle')}
        message={
          t('replace.confirmBody', {
            to: email,
            from: leaver?.name || '',
            sites: t('common.site', { count: selection.targets.length }),
          }) + (leaverAction === 'keep' ? '' : t('replace.confirmRemoval', { from: leaver?.name || '' }))
        }
        confirmText={t('replace.submit')}
        variant={leaverAction === 'project' ? 'danger' : 'primary'}
        onConfirm={handleRelay}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

export default RelayView;
