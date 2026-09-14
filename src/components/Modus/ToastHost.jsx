import React from 'react';
import ModusIcon from './ModusIcon';
import { useI18n } from '../../i18n/context';

const ICONS = {
  success: 'check',
  danger: 'warning',
  warning: 'warning',
  info: 'info',
};

const ToastHost = ({ toasts, onDismiss }) => {
  const { t } = useI18n();
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 1080 }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show align-items-center text-bg-${toast.variant} border-0 mb-2`}
          role="alert"
        >
          <div className="d-flex">
            <div className="toast-body d-flex align-items-center gap-2">
              <ModusIcon name={ICONS[toast.variant] || 'info'} size="18px" extraClasses="flex-shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label={t('common.close')}
              onClick={() => onDismiss(toast.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
