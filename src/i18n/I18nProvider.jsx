import React, { useCallback, useEffect, useMemo, useState } from 'react';
import en from './en';
import nl from './nl';
import cs from './cs';
import de from './de';
import es from './es';
import fr from './fr';
import hu from './hu';
import pl from './pl';
import { I18nContext, LANGUAGES, STORAGE_KEY } from './context';

const DICTIONARIES = { en, nl, cs, de, es, fr, hu, pl };

const readPath = (dictionary, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary);

const interpolate = (template, vars) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] === undefined || vars[name] === null ? '' : String(vars[name]),
  );

const detectLanguage = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && DICTIONARIES[stored]) return stored;
  const browser = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  return DICTIONARIES[browser] ? browser : 'en';
};

const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(detectLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const translate = useCallback(
    (key, vars = {}) => {
      const dictionary = DICTIONARIES[language] || en;

      // A `count` variable opts into the `_one` / `_other` sibling keys.
      const pluralKey =
        vars.count === undefined ? null : `${key}_${Number(vars.count) === 1 ? 'one' : 'other'}`;

      const value =
        (pluralKey && (readPath(dictionary, pluralKey) ?? readPath(en, pluralKey))) ??
        readPath(dictionary, key) ??
        readPath(en, key);

      if (value === undefined) {
        console.warn(`[i18n] Missing translation for "${key}"`);
        return key;
      }

      return interpolate(value, vars);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      languages: LANGUAGES,
      setLanguage: (next) => DICTIONARIES[next] && setLanguageState(next),
      t: translate,
    }),
    [language, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
