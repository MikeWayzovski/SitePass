import React from 'react';
import ModusIcon from './ModusIcon';
import { useI18n } from '../../i18n/context';

/**
 * Modus Bootstrap toasts use `.toast-{variant}` (Trimble blue / green / amber / red) with
 * white body text. Bootstrap's `.text-bg-info` does not exist in this package, so an info
 * toast used to keep the default white-on-translucent-white colors.
 */
const TOAST_VARIANTS = {
  info: { icon: 'info', closeWhite: false },
  success: { icon: 'check', closeWhite: true },
  warning: { icon: 'warning', closeWhite: true },
  danger: { icon: 'warning', closeWhite: true },
};

const resolveVariant = (variant) => {
  if (variant === 'error') return 'danger';
  if (TOAST_VARIANTS[variant]) return variant;
  return 'info';
};

const ToastHost = ({ toasts, onDismiss }) => {
  const { t } = useI18n();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const variant = resolveVariant(toast.variant);
        const meta = TOAST_VARIANTS[variant];

        return (
          <div
            key={toast.id}
            className={`toast toast-${variant} show align-items-center mb-2`}
            role="alert"
            aria-live={variant === 'danger' ? 'assertive' : 'polite'}
          >
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <ModusIcon
                  name={meta.icon}
                  type="solid"
                  size="18px"
                  extraClasses="flex-shrink-0"
                />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                className={`btn-close me-2 m-auto${meta.closeWhite ? ' btn-close-white' : ''}`}
                aria-label={t('common.close')}
                onClick={() => onDismiss(toast.id)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
