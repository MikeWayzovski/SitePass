import React, { useEffect, useRef, useState } from 'react';
import ModusIcon from '../Modus/ModusIcon';
import PersonAvatar from '../Modus/PersonAvatar';
import CopyableText from '../Modus/CopyableText';
import { useI18n } from '../../i18n/context';
import { fullName } from '../../api/accessApi';

const UserMenu = ({ user, onSignOut }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="btn btn-sm border-0 d-inline-flex align-items-center gap-2"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <PersonAvatar person={user} size={32} />
        <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '10rem' }}>
          {fullName(user)}
        </span>
        <ModusIcon name="caret-down" size="14px" extraClasses="text-muted" />
      </button>

      {isOpen ? (
        <div
          className="card border-0 shadow position-absolute end-0 mt-1 p-3"
          style={{ minWidth: '16rem', zIndex: 1050 }}
          role="menu"
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <PersonAvatar person={user} size={40} />
            <div className="min-w-0">
              <CopyableText value={fullName(user)} className="fw-semibold small" />
              <CopyableText value={user.email} className="text-muted small" />
            </div>
          </div>

          {onSignOut ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-2"
              onClick={onSignOut}
            >
              <ModusIcon name="sign-out" size="16px" />
              {t('common.signOut')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default UserMenu;
