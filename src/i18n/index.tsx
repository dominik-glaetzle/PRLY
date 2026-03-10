import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import de from './de.json';
import en from './en.json';

const LOCALE_STORAGE_KEY = 'prly:locale';

export const SUPPORTED_LOCALES = ['de', 'en'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

type TranslationValue =
  | string
  | string[]
  | {
      [key: string]: TranslationValue;
    };

type TranslationDictionary = Record<string, TranslationValue>;
type TranslationParams = Record<string, number | string>;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: string, params?: TranslationParams) => string;
  tm: <T>(key: string) => T;
  formatDate: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const dictionaries: Record<AppLocale, TranslationDictionary> = {
  de,
  en,
};

const defaultLocale = detectLocale();

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): AppLocale {
  const detected = Intl.DateTimeFormat().resolvedOptions().locale;
  return normalizeLocale(detected);
}

function normalizeLocale(locale?: string): AppLocale {
  if (locale?.toLowerCase().startsWith('de')) {
    return 'de';
  }

  return 'en';
}

function resolveValue(dictionary: TranslationDictionary, key: string): TranslationValue | undefined {
  return key.split('.').reduce<TranslationValue | undefined>((current, part) => {
    if (!current || Array.isArray(current) || typeof current === 'string') {
      return undefined;
    }

    return current[part];
  }, dictionary);
}

function interpolate(message: string, params?: TranslationParams) {
  if (!params) {
    return message;
  }

  return message.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((storedLocale) => {
        if (!mounted || !storedLocale) {
          return;
        }

        setLocaleState(normalizeLocale(storedLocale));
      })
      .catch(() => null);

    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[locale];

    return {
      locale,
      setLocale,
      t: (key, params) => {
        const resolved = resolveValue(dictionary, key);
        if (typeof resolved !== 'string') {
          return key;
        }

        return interpolate(resolved, params);
      },
      tm: <T,>(key: string) => {
        return resolveValue(dictionary, key) as T;
      },
      formatDate: (value, options) => {
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat(locale, options).format(date);
      },
      formatNumber: (value, options) => {
        return new Intl.NumberFormat(locale, options).format(value);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
