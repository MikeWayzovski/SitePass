import { createContext, useContext } from 'react';

export const LANGUAGES = [
  { id: 'en', label: 'English (English)' },
  { id: 'nl', label: 'Nederlands (Dutch)' },
  { id: 'cs', label: 'Čeština (Czech)' },
  { id: 'de', label: 'Deutsch (German)' },
  { id: 'es', label: 'Español (Spanish)' },
  { id: 'fr', label: 'Français (French)' },
  { id: 'hu', label: 'Magyar (Hungarian)' },
  { id: 'pl', label: 'Polski (Polish)' },
];

export const STORAGE_KEY = 'sitepass_language';

export const I18nContext = createContext(null);

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside an I18nProvider.');
  return value;
};
