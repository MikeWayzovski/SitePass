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
import { grantAccess } from '../../api/accessApi';
import { Logger } from '../../utils/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OnboardView = ({ projects, people, isLoadingPeople, region, getToken, defaults, showToast, recordAudit }) => {
  const { t } = useI18n();

  const [template, setTemplate] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [role, setRole] = useState(defaults.role);
  const [notify, setNotify] = useState(defaults.notify);
  const [createMissingGroups, setCreateMissingGroups] = useState(defaults.createMissingGroups);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState([]);

  const selection = useAccessSelection({ getToken, region, projects, person: template });

  const canSubmit =
    EMAIL_PATTERN.test(email) && selection.targets.length > 0 && !isRunning && !selection.isLoading;

  const handleOpenConfirm = () => {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(t('onboard.invalidEmail'));
      return;
    }
    if (selection.targets.length === 0) {
      showToast(t('onboard.nothingSelected'), 'warning');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleGrant = async () => {
    setIsConfirmOpen(false);
    setIsRunning(true);
    setReport([]);
    const steps = [];

    try {
      const token = await getToken();
      const targets = selection.targets.map((target) => ({ ...target, role }));

      const result = await grantAccess({
        token,
        region,
        email,
        targets,
        notify,
        createMissingGroups,
        onStep: (entry) => {
          steps.push(entry);
          setReport((current) => [...current, entry]);
        },
      });

      const failed = result.filter((entry) => entry.status === 'failed').length;
      showToast(
        failed ? t('progress.someFailed') : t('onboard.successBody', { email, count: targets.length }),
        failed ? 'warning' : 'success',
      );

      await recordAudit?.({
        actionType: 'ONBOARD',
        targetUserEmail: email,
        replacementUserEmail: '',
        projectsAffected: targets.map((target) => target.projectName),
        groupsAssigned: [...new Set(targets.flatMap((target) => target.groupNames || []))],
        stepDetails: result,
      });
    } catch (error) {
      Logger.error('Onboarding failed', error.message);
      showToast(t('errors.generic', { message: error.message }), 'danger');
      await recordAudit?.({
        actionType: 'ONBOARD',
        targetUserEmail: email,
        replacementUserEmail: '',
        projectsAffected: selection.targets.map((target) => target.projectName),
        groupsAssigned: [...new Set(selection.targets.flatMap((target) => target.groupNames || []))],
        stepDetails: steps,
        threw: true,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      <header>
        <h1 className="h4 fw-bold mb-1">{t('onboard.title')}</h1>
        <p className="text-muted mb-0">{t('onboard.subtitle')}</p>
      </header>

      <div className="row g-3">
        <div className="col-lg-5">
          <SectionCard step={1} title={t('onboard.step1')} hint={t('onboard.step1Hint')} className="h-100">
            <PersonPicker
              people={people}
              isLoading={isLoadingPeople}
              selectedId={template?.id}
              onSelect={setTemplate}
              emptyBody={t('errors.noProjects')}
            />

            {template ? (
              <div className="d-flex align-items-center gap-3 border rounded p-3 mt-3 bg-body-secondary">
                <PersonAvatar person={template} size={44} />
                <div className="min-w-0">
                  <CopyableText value={template.name} className="fw-semibold" />
                  <CopyableText value={template.email} className="text-muted small" />
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="col-lg-7 d-flex flex-column gap-3">
          <SectionCard step={2} title={t('onboard.step2')} hint={t('onboard.step2Hint')}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label small text-muted" htmlFor="onboard-email">
                  {t('common.email')}
                </label>
                <input
                  id="onboard-email"
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
              </div>

              <div className="col-md-4">
                <label className="form-label small text-muted" htmlFor="onboard-role">
                  {t('common.role')}
                </label>
                <select
                  id="onboard-role"
                  className="form-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  disabled={isRunning}
                >
                  <option value="USER">{t('common.roleUser')}</option>
                  <option value="ADMIN">{t('common.roleAdmin')}</option>
                </select>
              </div>
            </div>

            <div className="form-check mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="onboard-notify"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
                disabled={isRunning}
              />
              <label className="form-check-label small" htmlFor="onboard-notify">
                {t('onboard.notify')}
              </label>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="onboard-create-groups"
                checked={createMissingGroups}
                onChange={(event) => setCreateMissingGroups(event.target.checked)}
                disabled={isRunning}
              />
              <label className="form-check-label small" htmlFor="onboard-create-groups">
                {t('onboard.createMissing')}
              </label>
            </div>
          </SectionCard>

          <SectionCard step={3} title={t('onboard.step3')} hint={t('onboard.step3Hint')}>
            {selection.isLoading ? (
              <Spinner label={t('loading.access')} small />
            ) : (
              <AccessMatrix
                projects={selection.projects}
                selectedProjectIds={selection.selectedProjectIds}
                selectedGroupsByProject={selection.selectedGroupsByProject}
                onToggleProject={selection.toggleProject}
                onToggleGroup={selection.toggleGroup}
                onSelectAll={selection.selectAll}
                onClearAll={selection.clearAll}
                disabled={isRunning}
                emptyBody={t('onboard.step1Empty')}
              />
            )}

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
                  <ModusIcon name="user-plus" size="18px" />
                )}
                {isRunning ? t('common.working') : t('onboard.submit')}
              </button>
            </div>
          </SectionCard>

          {report.length > 0 || isRunning ? <ProgressReport report={report} isRunning={isRunning} /> : null}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={t('onboard.confirmTitle')}
        message={t('onboard.confirmBody', {
          email,
          projects: t('common.project', { count: selection.targets.length }),
          groups: t('common.group', { count: selection.groupCount }),
        })}
        confirmText={t('onboard.submit')}
        onConfirm={handleGrant}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

export default OnboardView;
