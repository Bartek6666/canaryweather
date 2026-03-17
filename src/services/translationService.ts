/**
 * Translation Service for AEMET Alert Messages
 *
 * Uses DeepL API for high-quality translations
 * Includes meteorological terminology corrections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage, LanguageCode } from '../i18n';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_API_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY || '';
const TRANSLATION_CACHE_PREFIX = '@alert_translation_v3_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// DeepL language codes (uppercase required)
const DEEPL_LANGUAGE_MAP: Record<LanguageCode, string> = {
  es: 'ES',
  en: 'EN',
  de: 'DE',
  pl: 'PL',
};

/**
 * Meteorological terminology corrections
 * Fixes literal translations that don't make sense in target language
 */
const METEO_CORRECTIONS: Record<string, Array<{ pattern: RegExp; replacement: string }>> = {
  PL: [
    // Sea/waves terminology
    { pattern: /połączone morze/gi, replacement: 'fale' },
    { pattern: /połączona fala/gi, replacement: 'fale' },
    { pattern: /morze połączone/gi, replacement: 'fale' },
    { pattern: /mar combinada/gi, replacement: 'fale' },
    { pattern: /morze z północnego zachodu/gi, replacement: 'fale z północnego zachodu' },
    { pattern: /morze z północy/gi, replacement: 'fale z północy' },
    { pattern: /morze z południa/gi, replacement: 'fale z południa' },
    { pattern: /morze z zachodu/gi, replacement: 'fale z zachodu' },
    { pattern: /morze z wschodu/gi, replacement: 'fale ze wschodu' },
    { pattern: /północno-zachodnie od (\d+)/gi, replacement: 'z północnego zachodu, wysokość $1' },
    { pattern: /północno-wschodnie od (\d+)/gi, replacement: 'z północnego wschodu, wysokość $1' },
    { pattern: /południowo-zachodnie od (\d+)/gi, replacement: 'z południowego zachodu, wysokość $1' },
    { pattern: /południowo-wschodnie od (\d+)/gi, replacement: 'z południowego wschodu, wysokość $1' },
    { pattern: /od (\d+) do (\d+)\s*m\.?/gi, replacement: 'o wysokości $1-$2 m' },
    { pattern: /(\d+) do (\d+)\s*m\.?/gi, replacement: '$1-$2 m' },
    // Wind terminology
    { pattern: /porywy wiatru/gi, replacement: 'porywy' },
    { pattern: /składnik zachodni/gi, replacement: 'wiatr zachodni' },
    { pattern: /składnik północny/gi, replacement: 'wiatr północny' },
    { pattern: /składnik wschodni/gi, replacement: 'wiatr wschodni' },
    { pattern: /składnik południowy/gi, replacement: 'wiatr południowy' },
    { pattern: /interwały nubosos/gi, replacement: 'zmienne zachmurzenie' },
    // General improvements
    { pattern: /morze denne/gi, replacement: 'fale pęcznienia' },
    { pattern: /mar de fondo/gi, replacement: 'fale pęcznienia' },
    { pattern: /strefy przybrzeżne/gi, replacement: 'wybrzeże' },
    { pattern: /zjawiska przybrzeżne/gi, replacement: 'zagrożenie na wybrzeżu' },
  ],
  EN: [
    // Sea/waves terminology
    { pattern: /combined sea/gi, replacement: 'waves' },
    { pattern: /sea combined/gi, replacement: 'waves' },
    { pattern: /from the northwest of (\d+)/gi, replacement: 'from the northwest, $1' },
    { pattern: /from the northeast of (\d+)/gi, replacement: 'from the northeast, $1' },
    { pattern: /from the southwest of (\d+)/gi, replacement: 'from the southwest, $1' },
    { pattern: /from the southeast of (\d+)/gi, replacement: 'from the southeast, $1' },
    { pattern: /(\d+) to (\d+)\s*m\.?/gi, replacement: '$1-$2 m' },
    // Wind terminology
    { pattern: /component west/gi, replacement: 'westerly wind' },
    { pattern: /component north/gi, replacement: 'northerly wind' },
    { pattern: /component east/gi, replacement: 'easterly wind' },
    { pattern: /component south/gi, replacement: 'southerly wind' },
    // General
    { pattern: /background sea/gi, replacement: 'swell' },
    { pattern: /coastal phenomena/gi, replacement: 'coastal hazard' },
  ],
  DE: [
    // Sea/waves terminology
    { pattern: /kombinierte See/gi, replacement: 'Wellen' },
    { pattern: /See kombiniert/gi, replacement: 'Wellen' },
    { pattern: /Dünung/gi, replacement: 'Wellengang' },
    { pattern: /von Nordwesten von (\d+)/gi, replacement: 'aus Nordwesten, $1' },
    { pattern: /von Nordosten von (\d+)/gi, replacement: 'aus Nordosten, $1' },
    { pattern: /von Südwesten von (\d+)/gi, replacement: 'aus Südwesten, $1' },
    { pattern: /von Südosten von (\d+)/gi, replacement: 'aus Südosten, $1' },
    { pattern: /(\d+) bis (\d+)\s*m\.?/gi, replacement: '$1-$2 m' },
    // Wind terminology
    { pattern: /Komponente West/gi, replacement: 'Westwind' },
    { pattern: /Komponente Nord/gi, replacement: 'Nordwind' },
    { pattern: /Komponente Ost/gi, replacement: 'Ostwind' },
    { pattern: /Komponente Süd/gi, replacement: 'Südwind' },
    // General
    { pattern: /Grundsee/gi, replacement: 'Dünung' },
    { pattern: /Küstenphänomene/gi, replacement: 'Küstenwarnung' },
  ],
};

/**
 * Applies meteorological terminology corrections to translated text
 */
function applyMeteoCorrections(text: string, targetLang: string): string {
  const corrections = METEO_CORRECTIONS[targetLang];
  if (!corrections) return text;

  let correctedText = text;
  for (const { pattern, replacement } of corrections) {
    correctedText = correctedText.replace(pattern, replacement);
  }

  // Clean up any double spaces
  correctedText = correctedText.replace(/\s+/g, ' ').trim();

  return correctedText;
}

interface CachedTranslation {
  text: string;
  timestamp: number;
}

interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

/**
 * Generates a cache key for a translation
 */
function getCacheKey(text: string, targetLang: string): string {
  const textHash = text.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '');
  return `${TRANSLATION_CACHE_PREFIX}${targetLang}_${textHash}`;
}

/**
 * Gets cached translation if available and not expired
 */
async function getCachedTranslation(text: string, targetLang: string): Promise<string | null> {
  try {
    const cacheKey = getCacheKey(text, targetLang);
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const { text: translatedText, timestamp }: CachedTranslation = JSON.parse(cached);

    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return translatedText;
  } catch {
    return null;
  }
}

/**
 * Saves translation to cache
 */
async function cacheTranslation(originalText: string, translatedText: string, targetLang: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(originalText, targetLang);
    const cacheData: CachedTranslation = {
      text: translatedText,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[Translation] Failed to cache translation:', error);
  }
}

/**
 * Translates text from Spanish to target language using DeepL API
 */
async function translateWithDeepL(text: string, targetLang: string): Promise<string | null> {
  if (!DEEPL_API_KEY) {
    console.warn('[Translation] No DeepL API key configured');
    return null;
  }

  const TIMEOUT_MS = 8000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'ES',
        target_lang: targetLang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Translation] DeepL API error: ${response.status}`);
      return null;
    }

    const data: DeepLResponse = await response.json();

    if (!data.translations || data.translations.length === 0) {
      console.warn('[Translation] No translations in response');
      return null;
    }

    const rawTranslation = data.translations[0].text;

    // Apply meteorological corrections
    const correctedTranslation = applyMeteoCorrections(rawTranslation, targetLang);

    if (rawTranslation !== correctedTranslation) {
      console.log(`[Translation] Applied meteo corrections: "${rawTranslation}" → "${correctedTranslation}"`);
    }

    return correctedTranslation;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Translation] Request timed out');
    } else {
      console.warn('[Translation] Error:', error);
    }
    return null;
  }
}

/**
 * Translates AEMET alert description to the user's current language
 *
 * @param spanishText - Original Spanish text from AEMET
 * @returns Translated text with meteorological corrections applied
 */
export async function translateAlertDescription(spanishText: string): Promise<{
  text: string;
  isTranslated: boolean;
  isFromCache: boolean;
}> {
  const currentLang = getCurrentLanguage();

  // No translation needed for Spanish users
  if (currentLang === 'es') {
    return { text: spanishText, isTranslated: false, isFromCache: false };
  }

  const targetLang = DEEPL_LANGUAGE_MAP[currentLang];

  // Check cache first
  const cached = await getCachedTranslation(spanishText, targetLang);
  if (cached) {
    console.log(`[Translation] Using cached translation for ${targetLang}`);
    return { text: cached, isTranslated: true, isFromCache: true };
  }

  // Translate via DeepL API
  console.log(`[Translation] Translating to ${targetLang} via DeepL...`);
  const translated = await translateWithDeepL(spanishText, targetLang);

  if (translated) {
    // Cache the corrected translation
    await cacheTranslation(spanishText, translated, targetLang);
    return { text: translated, isTranslated: true, isFromCache: false };
  }

  // Fallback to original Spanish text
  console.log('[Translation] Falling back to original Spanish text');
  return { text: spanishText, isTranslated: false, isFromCache: false };
}
