import { supabase } from './supabase';
import {
  WeatherData,
  SunChanceResult,
  MonthlyStats,
  AltitudeCorrection,
  StationMapping,
  LiveWeatherData,
  WeatherCondition,
} from '../types';
import locationsMapping from '../constants/locations_mapping.json';

// Constants from config
const LAPSE_RATE = locationsMapping.altitudeCorrection.lapseRate; // 0.6°C per 100m
const MIN_SUN_HOURS = locationsMapping.sunChanceConfig.minSunHours;
const MAX_PRECIP = locationsMapping.sunChanceConfig.maxPrecip;
const NORTHERN_MULTIPLIER = locationsMapping.sunChanceConfig.northernMultiplier;

/**
 * Applies altitude correction to temperature
 * Temperature decreases by 0.6°C per 100m of elevation
 */
export function applyAltitudeCorrection(
  temperature: number,
  stationAltitude: number,
  targetAltitude: number
): AltitudeCorrection {
  const altitudeDifference = targetAltitude - stationAltitude;
  const correctionApplied = (altitudeDifference / 100) * LAPSE_RATE;
  const correctedTemp = temperature - correctionApplied;

  return {
    originalTemp: temperature,
    correctedTemp: Math.round(correctedTemp * 10) / 10,
    altitudeDifference,
    correctionApplied: Math.round(correctionApplied * 10) / 10,
  };
}

/**
 * Calculates sun chance for a given station and date range
 * Sun Chance = (days with sol > 6h AND precip = 0) / total days
 * For northern stations without sol data, uses precip = 0 with 0.85 multiplier
 */
export async function calculateSunChance(
  stationId: string,
  month: number,
  dayStart: number = 1,
  dayEnd: number = 31
): Promise<SunChanceResult> {
  const station = locationsMapping.stations[stationId as keyof typeof locationsMapping.stations];
  const isNorthern = station?.isNorthern ?? false;

  // Query 10 years of data for the specified date range
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data, error } = await supabase
    .from('weather_data')
    .select('date, sol, precip')
    .eq('station_id', stationId)
    .gte('date', tenYearsAgo.toISOString().split('T')[0]);

  if (error) {
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      sunny_days: 0,
      total_days: 0,
      sun_chance: 0,
      confidence: 'low',
    };
  }

  // Filter data for the specified month and day range
  const filteredData = data.filter((row) => {
    const date = new Date(row.date);
    const rowMonth = date.getMonth() + 1;
    const rowDay = date.getDate();
    return rowMonth === month && rowDay >= dayStart && rowDay <= dayEnd;
  });

  const totalDays = filteredData.length;

  let sunnyDays: number;

  // Check if we have sol data
  const hasSolData = filteredData.some((row) => row.sol !== null);

  if (hasSolData) {
    // Use sol data: sunny day = sol > 6h AND precip = 0
    sunnyDays = filteredData.filter(
      (row) => row.sol !== null && row.sol > MIN_SUN_HOURS && (row.precip === null || row.precip <= MAX_PRECIP)
    ).length;
  } else {
    // No sol data: use precip = 0 as proxy, with multiplier for northern stations
    const dryDays = filteredData.filter(
      (row) => row.precip === null || row.precip <= MAX_PRECIP
    ).length;

    sunnyDays = isNorthern
      ? Math.round(dryDays * NORTHERN_MULTIPLIER)
      : dryDays;
  }

  const sunChance = totalDays > 0 ? Math.round((sunnyDays / totalDays) * 100) : 0;

  // Determine confidence based on data availability
  let confidence: 'high' | 'medium' | 'low';
  if (totalDays >= 50 && hasSolData) {
    confidence = 'high';
  } else if (totalDays >= 20) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    sunny_days: sunnyDays,
    total_days: totalDays,
    sun_chance: sunChance,
    confidence,
  };
}

/**
 * Gets monthly statistics for a station
 */
export async function getMonthlyStats(stationId: string): Promise<MonthlyStats[]> {
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data, error } = await supabase
    .from('weather_data')
    .select('date, tmax, tmin, precip, sol')
    .eq('station_id', stationId)
    .gte('date', tenYearsAgo.toISOString().split('T')[0]);

  if (error) {
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by month and calculate stats
  const monthlyData: Map<number, WeatherData[]> = new Map();

  data.forEach((row) => {
    const month = new Date(row.date).getMonth() + 1;
    if (!monthlyData.has(month)) {
      monthlyData.set(month, []);
    }
    monthlyData.get(month)!.push(row as WeatherData);
  });

  const stats: MonthlyStats[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthData = monthlyData.get(month) || [];

    if (monthData.length === 0) {
      stats.push({
        month,
        avg_tmax: 0,
        avg_tmin: 0,
        avg_precip: 0,
        avg_sol: 0,
        sun_chance: 0,
        rain_days: 0,
        total_days: 0,
      });
      continue;
    }

    const validTmax = monthData.filter((d) => d.tmax !== null);
    const validTmin = monthData.filter((d) => d.tmin !== null);
    const validPrecip = monthData.filter((d) => d.precip !== null);
    const validSol = monthData.filter((d) => d.sol !== null);

    const avgTmax = validTmax.length > 0
      ? validTmax.reduce((sum, d) => sum + (d.tmax || 0), 0) / validTmax.length
      : 0;

    const avgTmin = validTmin.length > 0
      ? validTmin.reduce((sum, d) => sum + (d.tmin || 0), 0) / validTmin.length
      : 0;

    const avgPrecip = validPrecip.length > 0
      ? validPrecip.reduce((sum, d) => sum + (d.precip || 0), 0) / validPrecip.length
      : 0;

    const avgSol = validSol.length > 0
      ? validSol.reduce((sum, d) => sum + (d.sol || 0), 0) / validSol.length
      : 0;

    const rainDays = monthData.filter((d) => d.precip !== null && d.precip > 0).length;

    const sunnyDays = monthData.filter(
      (d) => d.sol !== null && d.sol > MIN_SUN_HOURS && (d.precip === null || d.precip <= MAX_PRECIP)
    ).length;

    stats.push({
      month,
      avg_tmax: Math.round(avgTmax * 10) / 10,
      avg_tmin: Math.round(avgTmin * 10) / 10,
      avg_precip: Math.round(avgPrecip * 10) / 10,
      avg_sol: Math.round(avgSol * 10) / 10,
      sun_chance: monthData.length > 0 ? Math.round((sunnyDays / monthData.length) * 100) : 0,
      rain_days: rainDays,
      total_days: monthData.length,
    });
  }

  return stats;
}

/**
 * Finds the nearest station to given coordinates
 */
export function findNearestStation(
  lat: number,
  lon: number
): { stationId: string; distance: number; station: StationMapping } | null {
  let nearestStation: string | null = null;
  let minDistance = Infinity;

  const stations = locationsMapping.stations as Record<string, StationMapping>;

  for (const [stationId, station] of Object.entries(stations)) {
    const distance = haversineDistance(lat, lon, station.latitude, station.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = stationId;
    }
  }

  if (nearestStation) {
    return {
      stationId: nearestStation,
      distance: Math.round(minDistance * 100) / 100,
      station: stations[nearestStation],
    };
  }

  return null;
}

export interface NearbyStation {
  stationId: string;
  name: string;
  island: string;
  distance: number;
}

/**
 * Finds the 3 nearest stations to given coordinates, sorted by distance
 */
export function findNearestStations(
  lat: number,
  lon: number,
  count: number = 3
): NearbyStation[] {
  const stations = locationsMapping.stations as Record<string, StationMapping>;

  const withDistance = Object.entries(stations).map(([id, station]) => ({
    stationId: id,
    name: station.name,
    island: station.island,
    distance: Math.round(haversineDistance(lat, lon, station.latitude, station.longitude) * 10) / 10,
  }));

  return withDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/**
 * Finds a station by alias (city name, tourist area, etc.)
 */
export function findStationByAlias(alias: string): string | null {
  const normalizedAlias = alias.toLowerCase().trim();
  const stations = locationsMapping.stations as Record<string, StationMapping>;

  for (const [stationId, station] of Object.entries(stations)) {
    const matchedAlias = station.aliases.find(
      (a) => a.toLowerCase() === normalizedAlias
    );
    if (matchedAlias) {
      return stationId;
    }
  }

  // Partial match fallback
  for (const [stationId, station] of Object.entries(stations)) {
    const matchedAlias = station.aliases.find(
      (a) => a.toLowerCase().includes(normalizedAlias) || normalizedAlias.includes(a.toLowerCase())
    );
    if (matchedAlias) {
      return stationId;
    }
  }

  return null;
}

/**
 * Haversine formula to calculate distance between two points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Weekly sun chance data
 */
export interface WeeklyBestPeriod {
  weekStart: number; // day of year (1-365)
  weekEnd: number;
  monthName: string;
  dateRange: string;
  sunChance: number;
  avgTmax: number;
}

/**
 * Gets the best weeks for visiting a station based on historical sun chance data
 * Analyzes data in 7-day windows and returns top 3 sunniest periods
 */
export async function getBestWeeksForStation(stationId: string): Promise<WeeklyBestPeriod[]> {
  const station = locationsMapping.stations[stationId as keyof typeof locationsMapping.stations];
  const isNorthern = station?.isNorthern ?? false;

  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data, error } = await supabase
    .from('weather_data')
    .select('date, sol, precip, tmax')
    .eq('station_id', stationId)
    .gte('date', tenYearsAgo.toISOString().split('T')[0]);

  if (error || !data || data.length === 0) {
    return [];
  }

  // Group data by day of year (1-365)
  const dayOfYearData: Map<number, { sunny: number; total: number; tmaxSum: number; tmaxCount: number }> = new Map();

  const hasSolData = data.some((row) => row.sol !== null);

  data.forEach((row) => {
    const date = new Date(row.date);
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    if (!dayOfYearData.has(dayOfYear)) {
      dayOfYearData.set(dayOfYear, { sunny: 0, total: 0, tmaxSum: 0, tmaxCount: 0 });
    }

    const dayData = dayOfYearData.get(dayOfYear)!;
    dayData.total++;

    const isSunny = hasSolData
      ? row.sol !== null && row.sol > MIN_SUN_HOURS && (row.precip === null || row.precip <= MAX_PRECIP)
      : row.precip === null || row.precip <= MAX_PRECIP;

    if (isSunny) {
      dayData.sunny += isNorthern && !hasSolData ? NORTHERN_MULTIPLIER : 1;
    }

    if (row.tmax !== null) {
      dayData.tmaxSum += row.tmax;
      dayData.tmaxCount++;
    }
  });

  // Calculate 7-day rolling averages for each week
  const weeklyData: { start: number; sunChance: number; avgTmax: number }[] = [];

  for (let startDay = 1; startDay <= 358; startDay += 7) {
    let totalSunny = 0;
    let totalDays = 0;
    let tmaxSum = 0;
    let tmaxCount = 0;

    for (let d = startDay; d < startDay + 7 && d <= 365; d++) {
      const dayData = dayOfYearData.get(d);
      if (dayData) {
        totalSunny += dayData.sunny;
        totalDays += dayData.total;
        tmaxSum += dayData.tmaxSum;
        tmaxCount += dayData.tmaxCount;
      }
    }

    if (totalDays > 0) {
      weeklyData.push({
        start: startDay,
        sunChance: Math.round((totalSunny / totalDays) * 100),
        avgTmax: tmaxCount > 0 ? Math.round((tmaxSum / tmaxCount) * 10) / 10 : 0,
      });
    }
  }

  // Sort by sun chance and get top 3
  const topWeeks = weeklyData
    .sort((a, b) => b.sunChance - a.sunChance)
    .slice(0, 3);

  // Convert day of year to date range string
  const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const fullMonthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

  return topWeeks.map((week) => {
    const startDate = new Date(2024, 0, week.start);
    const endDate = new Date(2024, 0, week.start + 6);

    return {
      weekStart: week.start,
      weekEnd: week.start + 6,
      monthName: fullMonthNames[startDate.getMonth()],
      dateRange: `${startDate.getDate()} ${monthNames[startDate.getMonth()]} - ${endDate.getDate()} ${monthNames[endDate.getMonth()]}`,
      sunChance: week.sunChance,
      avgTmax: week.avgTmax,
    };
  });
}

// ─── WMO WEATHER CODE MAPPING ─────────────────────────────────────────────────

interface WmoMapping {
  condition: WeatherCondition;
  labelKey: string; // i18n key for translation
}

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs#weathervariables
 * labelKey maps to weather.* keys in i18n
 */
const WMO_CODE_MAP: Record<number, WmoMapping> = {
  // Clear sky
  0: { condition: 'sunny', labelKey: 'clearSky' },

  // Mainly clear, partly cloudy, and overcast
  1: { condition: 'sunny', labelKey: 'mainlyClear' },
  2: { condition: 'partly-sunny', labelKey: 'partlyCloudy' },
  3: { condition: 'cloudy', labelKey: 'overcast' },

  // Fog and depositing rime fog
  45: { condition: 'foggy', labelKey: 'fog' },
  48: { condition: 'foggy', labelKey: 'rimeFog' },

  // Drizzle: Light, moderate, and dense intensity
  51: { condition: 'rainy', labelKey: 'lightDrizzle' },
  53: { condition: 'rainy', labelKey: 'drizzle' },
  55: { condition: 'rainy', labelKey: 'denseDrizzle' },

  // Freezing Drizzle: Light and dense intensity
  56: { condition: 'rainy', labelKey: 'freezingDrizzle' },
  57: { condition: 'rainy', labelKey: 'denseFreezingDrizzle' },

  // Rain: Slight, moderate and heavy intensity
  61: { condition: 'rainy', labelKey: 'lightRain' },
  63: { condition: 'rainy', labelKey: 'rain' },
  65: { condition: 'rainy', labelKey: 'heavyRain' },

  // Freezing Rain: Light and heavy intensity
  66: { condition: 'rainy', labelKey: 'freezingRain' },
  67: { condition: 'rainy', labelKey: 'heavyFreezingRain' },

  // Snow fall: Slight, moderate, and heavy intensity
  71: { condition: 'snowy', labelKey: 'lightSnow' },
  73: { condition: 'snowy', labelKey: 'snow' },
  75: { condition: 'snowy', labelKey: 'heavySnow' },

  // Snow grains
  77: { condition: 'snowy', labelKey: 'snowGrains' },

  // Rain showers: Slight, moderate, and violent
  80: { condition: 'rainy', labelKey: 'showers' },
  81: { condition: 'rainy', labelKey: 'showers' },
  82: { condition: 'rainy', labelKey: 'violentShowers' },

  // Snow showers slight and heavy
  85: { condition: 'snowy', labelKey: 'snowShowers' },
  86: { condition: 'snowy', labelKey: 'heavySnowShowers' },

  // Thunderstorm: Slight or moderate / with slight and heavy hail
  95: { condition: 'stormy', labelKey: 'thunderstorm' },
  96: { condition: 'stormy', labelKey: 'thunderstormHail' },
  99: { condition: 'stormy', labelKey: 'severeThunderstorm' },
};

/**
 * Maps WMO weather code to condition and labelKey
 */
export function mapWmoCode(code: number): WmoMapping {
  return WMO_CODE_MAP[code] ?? { condition: 'cloudy', labelKey: 'unknown' };
}

// ─── LIVE WEATHER (Open-Meteo API) ────────────────────────────────────────────

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

// Mock data for development/testing when API is unavailable
const MOCK_WEATHER_DATA: LiveWeatherData[] = [
  { temperature: 24, humidity: 65, windSpeed: 12, weatherCode: 0, condition: 'sunny', conditionLabelKey: 'clearSky', timestamp: new Date().toISOString() },
  { temperature: 22, humidity: 70, windSpeed: 18, weatherCode: 1, condition: 'sunny', conditionLabelKey: 'mainlyClear', timestamp: new Date().toISOString() },
  { temperature: 20, humidity: 75, windSpeed: 15, weatherCode: 2, condition: 'partly-sunny', conditionLabelKey: 'partlyCloudy', timestamp: new Date().toISOString() },
  { temperature: 19, humidity: 80, windSpeed: 20, weatherCode: 3, condition: 'cloudy', conditionLabelKey: 'overcast', timestamp: new Date().toISOString() },
  { temperature: 18, humidity: 85, windSpeed: 25, weatherCode: 61, condition: 'rainy', conditionLabelKey: 'lightRain', timestamp: new Date().toISOString() },
];

function getMockWeatherData(): LiveWeatherData {
  // Return random mock data for variety
  const randomIndex = Math.floor(Math.random() * MOCK_WEATHER_DATA.length);
  return { ...MOCK_WEATHER_DATA[randomIndex], timestamp: new Date().toISOString() };
}

// Set to true to always use mock data (for UI development)
const USE_MOCK_DATA = __DEV__ && false; // Change to true to force mock data

/**
 * Fetches current weather data from Open-Meteo API (free, no API key required)
 * Falls back to mock data in development mode if network fails
 * @param lat Latitude
 * @param lon Longitude
 * @returns LiveWeatherData or null if request fails
 */
export async function fetchLiveWeather(
  lat: number,
  lon: number
): Promise<LiveWeatherData | null> {
  // Force mock data for UI testing
  if (USE_MOCK_DATA) {
    console.log('[DEV] Using mock weather data');
    return getMockWeatherData();
  }

  const TIMEOUT_MS = 10000; // 10 seconds timeout

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Open-Meteo API error: ${response.status}`);
      return __DEV__ ? getMockWeatherData() : null;
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.current) {
      console.warn('Open-Meteo API: No current data available');
      return __DEV__ ? getMockWeatherData() : null;
    }

    const { condition, labelKey } = mapWmoCode(data.current.weather_code);

    return {
      temperature: Math.round(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: Math.round(data.current.wind_speed_10m),
      weatherCode: data.current.weather_code,
      condition,
      conditionLabelKey: labelKey,
      timestamp: data.current.time,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Open-Meteo API: Request timed out');
      } else {
        console.warn('Open-Meteo API: Network error -', error.message);
      }
    }

    // Fallback to mock data in development mode
    if (__DEV__) {
      console.log('[DEV] Network failed, using mock weather data');
      return getMockWeatherData();
    }

    return null;
  }
}

// ─── CALIMA DETECTION (Open-Meteo Air Quality API) ────────────────────────────

// PM10 thresholds for Calima detection (µg/m³)
const PM10_CALIMA_THRESHOLD = 50; // Elevated dust levels
const PM10_SEVERE_CALIMA_THRESHOLD = 100; // Severe Calima conditions

export interface CalimaStatus {
  isDetected: boolean;
  isSevere: boolean;
  pm10: number;
  timestamp: string;
}

interface OpenMeteoAirQualityResponse {
  current: {
    time: string;
    pm10: number;
  };
}

/**
 * Fetches current air quality data to detect Calima (Saharan dust storm)
 * Uses Open-Meteo Air Quality API (free, no API key required)
 * @param lat Latitude
 * @param lon Longitude
 * @returns CalimaStatus or null if request fails
 */
export async function fetchCalimaStatus(
  lat: number,
  lon: number
): Promise<CalimaStatus | null> {
  const TIMEOUT_MS = 10000;

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Open-Meteo Air Quality API error: ${response.status}`);
      return null;
    }

    const data: OpenMeteoAirQualityResponse = await response.json();

    if (!data.current || data.current.pm10 === undefined) {
      console.warn('Open-Meteo Air Quality API: No PM10 data available');
      return null;
    }

    const pm10 = data.current.pm10;

    return {
      isDetected: pm10 >= PM10_CALIMA_THRESHOLD,
      isSevere: pm10 >= PM10_SEVERE_CALIMA_THRESHOLD,
      pm10: Math.round(pm10),
      timestamp: data.current.time,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Open-Meteo Air Quality API: Request timed out');
      } else {
        console.warn('Open-Meteo Air Quality API: Network error -', error.message);
      }
    }
    return null;
  }
}
