/**
 * AEMET Historical Data Fetcher
 *
 * Fetches 10 years of weather data from AEMET OpenData API
 * with rate limiting and retry logic.
 *
 * Usage: npx ts-node scripts/fetch-station.ts <station_id>
 * Example: npx ts-node scripts/fetch-station.ts C418Y
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface AemetDailyData {
  fecha: string;
  indicativo: string;
  nombre: string;
  provincia: string;
  altitud: string;
  tmax: string;
  horatmax: string;
  tmin: string;
  horatmin: string;
  tmed: string;
  prec: string;
  sol: string;
  velmedia: string;
  racha: string;
  dir: string;
}

interface ProcessedWeatherData {
  station_id: string;
  date: string;
  tmax: number | null;
  tmin: number | null;
  tavg: number | null;
  precip: number | null;
  sol: number | null;
  is_interpolated: boolean;
}

interface FetchResult {
  success: boolean;
  data?: ProcessedWeatherData[];
  error?: string;
  year?: number;
}

// Configuration
const CONFIG = {
  AEMET_BASE_URL: 'https://opendata.aemet.es/opendata/api',
  API_KEY: process.env.AEMET_API_KEY || '',
  DELAY_BETWEEN_YEARS_MS: 10000, // 10 seconds between API calls
  RETRY_DELAY_MS: 30000, // 30 seconds retry delay
  MAX_RETRIES: 3,
  START_YEAR: 2016,
  END_YEAR: 2026,
  TEMP_DIR: path.join(__dirname, '..', 'temp'),
};

// Ensure temp directory exists
if (!fs.existsSync(CONFIG.TEMP_DIR)) {
  fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats date as YYYY-MM-DDTHH:mm:ssUTC for AEMET API
 */
function formatAemetDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'UTC');
}

/**
 * Parses AEMET numeric value (handles commas as decimal separators)
 */
function parseAemetNumber(value: string | undefined): number | null {
  if (!value || value === '' || value === 'Ip' || value === 'Acum') {
    return null;
  }
  // AEMET uses comma as decimal separator
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Fetches data URL from AEMET (first request returns URL to actual data)
 */
async function fetchAemetDataUrl(
  stationId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const formattedStart = formatAemetDate(startDate);
  const formattedEnd = formatAemetDate(endDate);

  const url = `${CONFIG.AEMET_BASE_URL}/valores/climatologicos/diarios/datos/fechaini/${formattedStart}/fechafin/${formattedEnd}/estacion/${stationId}`;

  const response = await fetch(url, {
    headers: {
      'api_key': CONFIG.API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AEMET API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.estado !== 200) {
    throw new Error(`AEMET API returned estado: ${result.estado} - ${result.descripcion}`);
  }

  return result.datos;
}

/**
 * Fetches actual weather data from AEMET data URL
 */
async function fetchAemetData(dataUrl: string): Promise<AemetDailyData[]> {
  const response = await fetch(dataUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches data for a single period (max 5 months to stay under 6-month limit)
 */
async function fetchPeriodData(
  stationId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string,
  retryCount: number = 0
): Promise<FetchResult> {
  // Don't fetch future data
  const now = new Date();
  if (startDate > now) {
    return { success: true, data: [] };
  }

  // Adjust end date if it's in the future
  const effectiveEndDate = endDate > now ? now : endDate;

  try {
    console.log(`  [${periodLabel}] Fetching data...`);

    // Step 1: Get data URL
    const dataUrl = await fetchAemetDataUrl(stationId, startDate, effectiveEndDate);

    // Small delay between the two requests
    await sleep(1000);

    // Step 2: Fetch actual data
    const rawData = await fetchAemetData(dataUrl);

    // Step 3: Process data
    const processedData: ProcessedWeatherData[] = rawData.map(item => ({
      station_id: item.indicativo,
      date: item.fecha,
      tmax: parseAemetNumber(item.tmax),
      tmin: parseAemetNumber(item.tmin),
      tavg: parseAemetNumber(item.tmed),
      precip: parseAemetNumber(item.prec),
      sol: parseAemetNumber(item.sol),
      is_interpolated: false,
    }));

    console.log(`  [${periodLabel}] Fetched ${processedData.length} records`);

    return { success: true, data: processedData };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if error is retryable (500, 503, 429)
    const isRetryable =
      errorMessage.includes('500') ||
      errorMessage.includes('503') ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests') ||
      errorMessage.includes('Service Unavailable');

    if (isRetryable && retryCount < CONFIG.MAX_RETRIES) {
      console.log(`  [${periodLabel}] Error (${errorMessage}). Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} in 30s...`);
      await sleep(CONFIG.RETRY_DELAY_MS);
      return fetchPeriodData(stationId, startDate, endDate, periodLabel, retryCount + 1);
    }

    console.error(`  [${periodLabel}] Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generates 4-month periods for a given year range (stays safely under 6-month AEMET limit)
 */
function generatePeriods(startYear: number, endYear: number): Array<{ start: Date; end: Date; label: string }> {
  const periods: Array<{ start: Date; end: Date; label: string }> = [];

  for (let year = startYear; year < endYear; year++) {
    // Q1: Jan 1 - Apr 30 (4 months)
    periods.push({
      start: new Date(year, 0, 1),
      end: new Date(year, 3, 30, 23, 59, 59),
      label: `${year}-Q1`,
    });

    // Q2: May 1 - Aug 31 (4 months)
    periods.push({
      start: new Date(year, 4, 1),
      end: new Date(year, 7, 31, 23, 59, 59),
      label: `${year}-Q2`,
    });

    // Q3: Sep 1 - Dec 31 (4 months)
    periods.push({
      start: new Date(year, 8, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
      label: `${year}-Q3`,
    });
  }

  return periods;
}

/**
 * Linear interpolation for missing tavg (tmed) values
 */
function interpolateMissingTemperatures(data: ProcessedWeatherData[]): ProcessedWeatherData[] {
  // Sort by date
  const sorted = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Find gaps in tavg and interpolate
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].tavg === null) {
      // Find previous valid value
      let prevIndex = i - 1;
      while (prevIndex >= 0 && sorted[prevIndex].tavg === null) {
        prevIndex--;
      }

      // Find next valid value
      let nextIndex = i + 1;
      while (nextIndex < sorted.length && sorted[nextIndex].tavg === null) {
        nextIndex++;
      }

      // Interpolate if we have both bounds
      if (prevIndex >= 0 && nextIndex < sorted.length) {
        const prevValue = sorted[prevIndex].tavg!;
        const nextValue = sorted[nextIndex].tavg!;
        const totalGap = nextIndex - prevIndex;
        const position = i - prevIndex;

        // Linear interpolation
        const interpolatedValue = prevValue + (nextValue - prevValue) * (position / totalGap);
        sorted[i].tavg = Math.round(interpolatedValue * 10) / 10;
        sorted[i].is_interpolated = true;
      }
      // If only previous value exists, use it
      else if (prevIndex >= 0) {
        sorted[i].tavg = sorted[prevIndex].tavg;
        sorted[i].is_interpolated = true;
      }
      // If only next value exists, use it
      else if (nextIndex < sorted.length) {
        sorted[i].tavg = sorted[nextIndex].tavg;
        sorted[i].is_interpolated = true;
      }
      // If we have tmax and tmin, calculate average
      else if (sorted[i].tmax !== null && sorted[i].tmin !== null) {
        sorted[i].tavg = Math.round(((sorted[i].tmax! + sorted[i].tmin!) / 2) * 10) / 10;
        sorted[i].is_interpolated = true;
      }
    }
  }

  return sorted;
}

/**
 * Main function to fetch all data for a station
 */
async function fetchStation(stationId: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Fetching data for station: ${stationId}`);
  console.log(`Date range: ${CONFIG.START_YEAR}-01-01 to ${CONFIG.END_YEAR}-01-01`);
  console.log(`Using 5-month periods (AEMET 6-month limit)`);
  console.log(`${'='.repeat(60)}\n`);

  if (!CONFIG.API_KEY) {
    console.error('ERROR: AEMET_API_KEY not set in environment variables');
    console.error('Please set AEMET_API_KEY in your .env file');
    process.exit(1);
  }

  const allData: ProcessedWeatherData[] = [];
  const errors: { period: string; error: string }[] = [];

  // Generate all periods
  const periods = generatePeriods(CONFIG.START_YEAR, CONFIG.END_YEAR);
  console.log(`Total periods to fetch: ${periods.length}\n`);

  // Fetch period by period
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const result = await fetchPeriodData(stationId, period.start, period.end, period.label);

    if (result.success && result.data) {
      allData.push(...result.data);
    } else if (result.error) {
      errors.push({ period: period.label, error: result.error });
    }

    // Delay between periods (except for the last one)
    if (i < periods.length - 1) {
      console.log(`  Waiting ${CONFIG.DELAY_BETWEEN_YEARS_MS / 1000}s before next request...`);
      await sleep(CONFIG.DELAY_BETWEEN_YEARS_MS);
    }
  }

  // Interpolate missing temperatures
  console.log('\nInterpolating missing temperature values...');
  const interpolatedData = interpolateMissingTemperatures(allData);

  const interpolatedCount = interpolatedData.filter(d => d.is_interpolated).length;
  console.log(`  Interpolated ${interpolatedCount} records`);

  // Save to file
  const outputPath = path.join(CONFIG.TEMP_DIR, `station_${stationId}.json`);

  const output = {
    station_id: stationId,
    fetched_at: new Date().toISOString(),
    date_range: {
      start: `${CONFIG.START_YEAR}-01-01`,
      end: `${CONFIG.END_YEAR}-01-01`,
    },
    total_records: interpolatedData.length,
    interpolated_records: interpolatedCount,
    errors: errors.length > 0 ? errors : undefined,
    data: interpolatedData,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPLETED: ${stationId}`);
  console.log(`  Total records: ${interpolatedData.length}`);
  console.log(`  Interpolated: ${interpolatedCount}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Saved to: ${outputPath}`);
  console.log(`${'='.repeat(60)}\n`);
}

// CLI entry point
const stationId = process.argv[2];

if (!stationId) {
  console.log('Usage: npx ts-node scripts/fetch-station.ts <station_id>');
  console.log('Example: npx ts-node scripts/fetch-station.ts C418Y');
  console.log('\nAvailable stations:');

  // Load and display available stations
  const mappingPath = path.join(__dirname, '..', 'src', 'constants', 'locations_mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

  Object.entries(mapping.stations).forEach(([id, station]: [string, any]) => {
    console.log(`  ${id}: ${station.name} (${station.island})`);
  });

  process.exit(1);
}

// Run
fetchStation(stationId).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
