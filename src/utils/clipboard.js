/**
 * Copies text to the clipboard. navigator.clipboard is frequently blocked inside
 * the Trimble Connect iframe, so this falls back to the legacy execCommand path.
 */
export const copyToClipboard = async (text) => {
  const value = String(text ?? '').trim();
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Iframe or missing permission: fall through to the legacy path.
  }

  try {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-hidden', 'true');
    field.className = 'position-fixed';
    field.style.cssText = 'top:0;left:-9999px;opacity:0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, field.value.length);
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch {
    return false;
  }
};
