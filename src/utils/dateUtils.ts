/**
 * Date utilities for Canary Weather
 * DRY: Centralized date formatting functions
 */

import { TFunction } from 'i18next';
import { MONTH_KEYS, MonthKey } from '../i18n';

/**
 * Gets localized month name with proper grammatical case
 * For Polish, uses locative case (miejscownik) when useLocative=true
 * For other languages, returns nominative form
 *
 * @param month Month number (1-12)
 * @param language Current language code (e.g., 'pl', 'en')
 * @param t Translation function from useTranslation()
 * @param useLocative Whether to use locative case (for Polish "w marcu" vs "marzec")
 * @returns Translated month name
 */
export function getLocalizedMonthName(
  month: number,
  language: string,
  t: TFunction,
  useLocative: boolean = false
): string {
  const monthKey = MONTH_KEYS[month - 1] as MonthKey;
  if (!monthKey) return '';

  if (useLocative && language === 'pl') {
    return t(`monthsLocative.${monthKey}`);
  }

  return t(`months.${monthKey}`);
}

/**
 * Formats an ISO date string to a human-readable format for alerts
 * Example: "2024-02-15T14:00:00" → "15 Feb 14:00"
 *
 * @param isoString ISO 8601 date string
 * @returns Formatted date string or fallback text if invalid
 */
export function formatAlertDateTime(isoString: string | undefined | null): string {
  if (!isoString) return '--';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--';

    const day = date.getDate();
    const month = date.toLocaleString('en', { month: 'short' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${hours}:${minutes}`;
  } catch {
    return '--';
  }
}
