import { createContext, useContext } from 'react';

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'nl', label: 'Nederlands' },
];

export const STORAGE_KEY = 'sitepass_language';

export const I18nContext = createContext(null);

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside an I18nProvider.');
  return value;
};
