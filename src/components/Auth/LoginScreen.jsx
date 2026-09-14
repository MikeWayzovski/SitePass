import React from 'react';
import ModusIcon from '../Modus/ModusIcon';
import { useI18n } from '../../i18n/context';

const LoginScreen = ({ isLoading, isCallback, isConfigured, error, onLogin }) => {
  const { t } = useI18n();

  const title = isCallback ? t('auth.signingIn') : isLoading ? t('auth.checking') : t('auth.title');
  const body = isCallback ? t('auth.signingInBody') : isLoading ? t('auth.checkingBody') : t('auth.body');

  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 bg-body-secondary p-3">
      <div className="card shadow-sm border-0" style={{ maxWidth: '28rem', width: '100%' }}>
        <div className="card-body p-4 text-center">
          <ModusIcon name="shield-check" size="48px" extraClasses="text-primary mb-3" />
          <h1 className="h4 fw-bold mb-1">{title}</h1>
          <p className="text-muted mb-4">{body}</p>

          {error ? (
            <div className="alert alert-danger text-start small" role="alert">
              {t('auth.failed', { message: error })}
            </div>
          ) : null}

          {!isConfigured && !isLoading ? (
            <div className="alert alert-warning text-start small" role="alert">
              {t('auth.notConfigured')}
            </div>
          ) : null}

          {isLoading || isCallback ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{t('common.loading')}</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={onLogin}
              disabled={!isConfigured}
            >
              <ModusIcon name="person" size="18px" />
              {t('common.signIn')}
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default LoginScreen;
