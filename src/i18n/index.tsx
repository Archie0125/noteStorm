import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './locales/en';
import { zhTW } from './locales/zh-TW';
import type { LocaleKey } from './locales/en';

export type Locale = 'en' | 'zh-TW';

const LOCALE_STORAGE_KEY = 'noteStorm_locale';

const messages: Record<Locale, Record<LocaleKey, string>> = {
  en,
  'zh-TW': zhTW,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: LocaleKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    return stored && (stored === 'en' || stored === 'zh-TW') ? stored : 'en';
  });

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);

  const t = (key: LocaleKey): string => {
    const msg = messages[locale][key];
    return msg ?? (messages.en[key] as string) ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
