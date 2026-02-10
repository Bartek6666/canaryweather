import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import pl from './locales/pl.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';

export const LANGUAGES = {
  PL: 'pl',
  EN: 'en',
  DE: 'de',
  ES: 'es',
} as const;

export type LanguageCode = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  pl: 'PL',
  en: 'EN',
  de: 'DE',
  es: 'ES',
};

const LANGUAGE_STORAGE_KEY = '@canary_weather_language';

// Get supported language from device locale
function getDeviceLanguage(): LanguageCode {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

  // Check if device language is supported
  if (Object.values(LANGUAGES).includes(deviceLocale as LanguageCode)) {
    return deviceLocale as LanguageCode;
  }

  // Default to English if not supported
  return LANGUAGES.EN;
}

// Month keys for translation
export const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export type MonthKey = (typeof MONTH_KEYS)[number];

// Helper to get translated month name
export function getMonthName(monthIndex: number): MonthKey {
  return MONTH_KEYS[monthIndex] ?? 'january';
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
    },
    lng: getDeviceLanguage(),
    fallbackLng: LANGUAGES.EN,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language preference
export async function loadSavedLanguage(): Promise<void> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && Object.values(LANGUAGES).includes(savedLanguage as LanguageCode)) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.warn('Failed to load saved language:', error);
  }
}

// Change language and persist
export async function changeLanguage(language: LanguageCode): Promise<void> {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
}

// Get current language
export function getCurrentLanguage(): LanguageCode {
  return (i18n.language as LanguageCode) ?? LANGUAGES.EN;
}

export default i18n;
