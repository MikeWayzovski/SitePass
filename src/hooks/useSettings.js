import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sitepass_settings';

const DEFAULTS = {
  region: 'europe',
  role: 'USER',
  notify: true,
  createMissingCrews: true,
};

const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState(read);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  return { settings, updateSetting };
};
