import React, { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/context';

/**
 * Rendered inline rather than through Bootstrap's JS so open state stays in React.
 */
const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'primary',
  isBusy = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useI18n();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    confirmRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) onCancel?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isBusy, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h3 className="modal-title h6 fw-bold mb-0" id="confirm-modal-title">
                {title}
              </h3>
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={isBusy}
              >
                {cancelText || t('common.cancel')}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn btn-${variant} d-inline-flex align-items-center gap-2`}
                onClick={onConfirm}
                disabled={isBusy}
              >
                {isBusy ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : null}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;
