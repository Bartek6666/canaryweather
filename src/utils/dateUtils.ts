/**
 * Date utilities for Canary Weather
 * DRY: Centralized date formatting functions
 */

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
