import { APP_VERSION } from '../appInfo';

const STORAGE_KEY = 'sitepass_audit_log';
const MAX_ENTRIES = 200;

export const ACTION_TYPES = {
  ONBOARD: 'ONBOARD',
  REPLACE: 'REPLACE',
};

export const AUDIT_STATUS = {
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  FAILED: 'FAILED',
};

export const CSV_SEPARATORS = {
  comma: ',',
  semicolon: ';',
};

const readStore = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStore = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
};

export const statusFromSteps = (steps = [], threw = false) => {
  const failed = steps.filter((step) => step.status === 'failed').length;
  const done = steps.filter((step) => step.status === 'done').length;
  if (threw && steps.length === 0) return AUDIT_STATUS.FAILED;
  if (failed === 0 && !threw) return AUDIT_STATUS.SUCCESS;
  if (done > 0 && failed > 0) return AUDIT_STATUS.PARTIAL_SUCCESS;
  if (failed > 0) return AUDIT_STATUS.FAILED;
  return threw ? AUDIT_STATUS.FAILED : AUDIT_STATUS.SUCCESS;
};

export const listAuditEntries = () => readStore();

export const clearAuditEntries = () => localStorage.removeItem(STORAGE_KEY);

/**
 * Persists one onboarding or replacement run. Arrays are stored as arrays;
 * CSV export flattens them for Excel.
 */
export const recordAuditEntry = (partial) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actionType: partial.actionType || ACTION_TYPES.ONBOARD,
    executedBy: partial.executedBy || '',
    targetUserEmail: partial.targetUserEmail || '',
    replacementUserEmail: partial.replacementUserEmail || '',
    projectsAffected: Array.isArray(partial.projectsAffected) ? partial.projectsAffected : [],
    groupsAssigned: Array.isArray(partial.groupsAssigned) ? partial.groupsAssigned : [],
    status: partial.status || statusFromSteps(partial.stepDetails, partial.threw),
    stepDetails: Array.isArray(partial.stepDetails) ? partial.stepDetails : [],
    appVersion: APP_VERSION,
  };

  const next = [...readStore(), entry];
  writeStore(next);
  return entry;
};

const csvEscape = (value, separator) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/["\r\n]/.test(text) || text.includes(separator)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const joinList = (value, separator) => {
  const items = Array.isArray(value) ? value : [];
  const inner = separator === ';' ? ', ' : '; ';
  return items.join(inner);
};

const formatSteps = (steps, separator) =>
  (Array.isArray(steps) ? steps : [])
    .map((step) => `${step.status || ''}: ${step.project || ''} — ${step.message || ''}`.trim())
    .join(separator === ';' ? ' | ' : '; ');

export const CSV_COLUMNS = [
  'timestamp',
  'actionType',
  'executedBy',
  'targetUserEmail',
  'replacementUserEmail',
  'projectsAffected',
  'groupsAssigned',
  'status',
  'stepDetails',
];

/**
 * Excel-friendly CSV. Semicolon is the default in European Excel; comma is US.
 * A UTF-8 BOM is prepended so Excel recognises the encoding.
 */
export const exportToCSV = (logData, separatorKey = 'semicolon') => {
  const separator = CSV_SEPARATORS[separatorKey] || CSV_SEPARATORS.semicolon;
  const rows = Array.isArray(logData) ? logData : [logData];
  const header = CSV_COLUMNS.join(separator);
  const body = rows.map((entry) =>
    [
      entry.timestamp,
      entry.actionType,
      entry.executedBy,
      entry.targetUserEmail,
      entry.replacementUserEmail,
      joinList(entry.projectsAffected, separator),
      joinList(entry.groupsAssigned, separator),
      entry.status,
      formatSteps(entry.stepDetails, separator),
    ]
      .map((cell) => csvEscape(cell, separator))
      .join(separator),
  );
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
};

export const exportToJSON = (logData) =>
  `${JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      entries: Array.isArray(logData) ? logData : [logData],
    },
    null,
    2,
  )}\n`;

export const stampFileName = (prefix, extension) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${stamp}.${extension}`;
};

export const downloadTextFile = (fileName, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadAuditCsv = (separatorKey = 'semicolon') => {
  const entries = listAuditEntries();
  if (entries.length === 0) return false;
  downloadTextFile(stampFileName('sitepass-audit', 'csv'), exportToCSV(entries, separatorKey), 'text/csv;charset=utf-8');
  return true;
};
