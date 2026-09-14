import React, { useEffect, useRef, useState } from 'react';
import ModusIcon from './ModusIcon';
import { copyToClipboard } from '../../utils/clipboard';
import { useI18n } from '../../i18n/context';

/**
 * Icon-only button that copies `value` to the clipboard and briefly confirms.
 * Reusable next to names, emails, ids, paths, anything worth grabbing in one click.
 */
const CopyButton = ({ value, ariaLabel, extraClasses = '', iconSize = '14px' }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  if (!String(value ?? '').trim()) return null;

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!(await copyToClipboard(value))) return;

    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const label = copied ? t('common.copied') : ariaLabel || t('common.copy', { value: String(value).trim() });

  return (
    <button
      type="button"
      className={`btn btn-icon-only btn-sm border-0 flex-shrink-0 ${extraClasses}`.trim()}
      aria-label={label}
      title={label}
      onClick={handleClick}
    >
      <ModusIcon
        name={copied ? 'check' : 'copy'}
        size={iconSize}
        extraClasses={copied ? 'text-success' : 'text-muted'}
      />
      <span className="visually-hidden" aria-live="polite">
        {copied ? t('common.copied') : ''}
      </span>
    </button>
  );
};

export default CopyButton;
