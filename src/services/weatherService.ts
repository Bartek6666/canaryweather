import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  WeatherData,
  SunChanceResult,
  MonthlyStats,
  StationMapping,
  LiveWeatherData,
  WeatherCondition,
} from '../types';
import locationsMapping from '../constants/locations_mapping.json';

// ─── OFFLINE CACHE ────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'weather_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── IN-MEMORY RATE LIMIT CACHE (15 min) ──────────────────────────────────────

const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const inMemoryCache: Map<string, { data: LiveWeatherData; timestamp: number }> = new Map();

/**
 * Gets data from in-memory cache if not expired (15 min TTL)
 * Prevents excessive API calls for the same station
 */
function getFromRateLimitCache(stationId: string): LiveWeatherData | null {
  const cached = inMemoryCache.get(stationId);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > RATE_LIMIT_MS) {
    inMemoryCache.delete(stationId);
    return null;
  }

  return cached.data;
}

/**
 * Saves data to in-memory rate limit cache
 */
function saveToRateLimitCache(stationId: string, data: LiveWeatherData): void {
  inMemoryCache.set(stationId, { data, timestamp: Date.now() });
}

interface CachedWeatherData {
  data: LiveWeatherData;
  timestamp: number;
  stationId: string;
}

/**
 * Saves weather data to AsyncStorage cache
 */
async function saveWeatherToCache(stationId: string, data: LiveWeatherData): Promise<void> {
  try {
    const cacheEntry: CachedWeatherData = {
      data,
      timestamp: Date.now(),
      stationId,
    };
    await AsyncStorage.setItem(
      `${CACHE_KEY_PREFIX}${stationId}`,
      JSON.stringify(cacheEntry)
    );
  } catch (error) {
    console.warn('Failed to save weather to cache:', error);
  }
}

/**
 * Retrieves weather data from AsyncStorage cache
 * Returns null if cache is empty, expired, or invalid
 */
async function getWeatherFromCache(stationId: string): Promise<LiveWeatherData | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${stationId}`);
    if (!cached) return null;

    const cacheEntry: CachedWeatherData = JSON.parse(cached);

    // Validate cache entry structure
    if (!cacheEntry.data || !cacheEntry.timestamp || !cacheEntry.stationId) {
      return null;
    }

    // Check if cache is expired (older than 24 hours)
    if (Date.now() - cacheEntry.timestamp > CACHE_EXPIRY_MS) {
      console.log('[Cache] Weather data expired, removing');
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${stationId}`);
      return null;
    }

    // Validate LiveWeatherData structure
    const data = cacheEntry.data;
    if (
      typeof data.temperature !== 'number' ||
      typeof data.humidity !== 'number' ||
      typeof data.windSpeed !== 'number' ||
      typeof data.weatherCode !== 'number' ||
      typeof data.condition !== 'string' ||
      typeof data.conditionLabelKey !== 'string'
    ) {
      console.warn('[Cache] Invalid weather data structure');
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Failed to read weather from cache:', error);
    return null;
  }
}

// Constants from config
const MIN_SUN_HOURS = locationsMapping.sunChanceConfig.minSunHours;
const MAX_PRECIP = locationsMapping.sunChanceConfig.maxPrecip;
const NORTHERN_MULTIPLIER = locationsMapping.sunChanceConfig.northernMultiplier;

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

  let data;
  try {
    const result = await supabase
      .from('weather_data')
      .select('date, sol, precip')
      .eq('station_id', stationId)
      .gte('date', tenYearsAgo.toISOString().split('T')[0]);

    if (result.error) {
      console.warn('[Offline] Cannot fetch sun chance data:', result.error.message);
      return {
        sunny_days: 0,
        total_days: 0,
        sun_chance: 0,
        confidence: 'low',
      };
    }
    data = result.data;
  } catch (e) {
    console.warn('[Offline] Network error fetching sun chance data');
    return {
      sunny_days: 0,
      total_days: 0,
      sun_chance: 0,
      confidence: 'low',
    };
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

  let data;
  try {
    const result = await supabase
      .from('weather_data')
      .select('date, tmax, tmin, precip, sol')
      .eq('station_id', stationId)
      .gte('date', tenYearsAgo.toISOString().split('T')[0]);

    if (result.error) {
      console.warn('[Offline] Cannot fetch monthly stats:', result.error.message);
      return [];
    }
    data = result.data;
  } catch (e) {
    console.warn('[Offline] Network error fetching monthly stats');
    return [];
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
 * @param excludeHighAltitude If true (default), excludes high altitude stations (Izaña, Roque de los Muchachos)
 * @param forceHighAltitude If true, prefers high altitude stations (for mountain peaks), falls back to regular stations if none available
 */
export function findNearestStation(
  lat: number,
  lon: number,
  excludeHighAltitude: boolean = true,
  forceHighAltitude: boolean = false
): { stationId: string; distance: number; station: StationMapping; isHighAltitudeFallback?: boolean } | null {
  const stations = locationsMapping.stations as Record<string, StationMapping>;

  let nearestHighAltitude: { id: string; distance: number } | null = null;
  let nearestRegular: { id: string; distance: number } | null = null;

  for (const [stationId, station] of Object.entries(stations)) {
    const distance = haversineDistance(lat, lon, station.latitude, station.longitude);

    if (station.isHighAltitude) {
      // Track nearest high altitude station
      if (!nearestHighAltitude || distance < nearestHighAltitude.distance) {
        nearestHighAltitude = { id: stationId, distance };
      }
    } else {
      // Track nearest regular station
      if (!nearestRegular || distance < nearestRegular.distance) {
        nearestRegular = { id: stationId, distance };
      }
    }
  }

  // For mountain peaks: prefer high altitude station, fallback to regular if too far
  // Fallback threshold: use regular station if high altitude is >3x farther and regular is <40km
  const HIGH_ALT_FALLBACK_RATIO = 3;
  const REGULAR_STATION_MAX_KM = 40;

  if (forceHighAltitude) {
    const shouldFallback = nearestHighAltitude && nearestRegular &&
      nearestRegular.distance < REGULAR_STATION_MAX_KM &&
      nearestHighAltitude.distance > nearestRegular.distance * HIGH_ALT_FALLBACK_RATIO;

    if (nearestHighAltitude && !shouldFallback) {
      return {
        stationId: nearestHighAltitude.id,
        distance: Math.round(nearestHighAltitude.distance * 100) / 100,
        station: stations[nearestHighAltitude.id],
      };
    }
    // Fallback to nearest regular station (e.g., Pico de las Nieves on Gran Canaria - no local high altitude station)
    if (nearestRegular) {
      console.log(`[Station] High altitude station too far (${nearestHighAltitude?.distance.toFixed(1)}km), using fallback: ${stations[nearestRegular.id].name} (${nearestRegular.distance.toFixed(1)}km)`);
      return {
        stationId: nearestRegular.id,
        distance: Math.round(nearestRegular.distance * 100) / 100,
        station: stations[nearestRegular.id],
        isHighAltitudeFallback: true,
      };
    }
    return null;
  }

  // For regular locations: exclude high altitude stations
  if (excludeHighAltitude && nearestRegular) {
    return {
      stationId: nearestRegular.id,
      distance: Math.round(nearestRegular.distance * 100) / 100,
      station: stations[nearestRegular.id],
    };
  }

  // Include all stations
  const nearest = nearestRegular && nearestHighAltitude
    ? (nearestRegular.distance < nearestHighAltitude.distance ? nearestRegular : nearestHighAltitude)
    : nearestRegular || nearestHighAltitude;

  if (nearest) {
    return {
      stationId: nearest.id,
      distance: Math.round(nearest.distance * 100) / 100,
      station: stations[nearest.id],
    };
  }

  return null;
}

export interface NearbyStation {
  stationId: string;
  name: string;
  island: string;
  distance: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Finds the 3 nearest stations to given coordinates, sorted by distance
 * @param excludeHighAltitude If true (default), excludes high altitude stations (Izaña, Roque de los Muchachos)
 */
export function findNearestStations(
  lat: number,
  lon: number,
  count: number = 3,
  excludeHighAltitude: boolean = true
): NearbyStation[] {
  const stations = locationsMapping.stations as Record<string, StationMapping>;

  const withDistance = Object.entries(stations)
    .filter(([_, station]) => !excludeHighAltitude || !station.isHighAltitude)
    .map(([id, station]) => ({
      stationId: id,
      name: station.name,
      island: station.island,
      distance: Math.round(haversineDistance(lat, lon, station.latitude, station.longitude) * 10) / 10,
      latitude: station.latitude,
      longitude: station.longitude,
    }));

  return withDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

// ─── INTELLIGENT INTERPOLATION ────────────────────────────────────────────────

const SINGLE_STATION_THRESHOLD_KM = 5; // Use single station if closer than 5km

/**
 * Calculates inverse distance weights for interpolation
 * Closer stations have higher weights
 * @param distances Array of distances in km
 * @returns Array of weights (sum = 1)
 */
function calculateDistanceWeights(distances: number[]): number[] {
  // Use inverse distance weighting (IDW)
  // Weight = 1 / distance^2 (squared for stronger locality)
  const inverseDistances = distances.map(d => 1 / Math.pow(Math.max(d, 0.1), 2));
  const sum = inverseDistances.reduce((a, b) => a + b, 0);
  return inverseDistances.map(w => w / sum);
}

/**
 * Interpolated weather result from multiple stations
 */
export interface InterpolatedWeatherResult {
  data: LiveWeatherData;
  stations: Array<{
    stationId: string;
    name: string;
    distance: number;
    weight: number;
  }>;
  isSingleStation: boolean;
  isFromCache: boolean;
}

/**
 * Fetches and interpolates live weather from nearest stations
 * - If closest station < 5km: uses only that station
 * - Otherwise: weighted average from 3 nearest stations
 *
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param forceRefresh Skip cache if true
 */
export async function fetchInterpolatedWeather(
  targetLat: number,
  targetLon: number,
  forceRefresh: boolean = false
): Promise<InterpolatedWeatherResult | null> {
  // Find 3 nearest stations
  const nearestStations = findNearestStations(targetLat, targetLon, 3);

  if (nearestStations.length === 0) {
    return null;
  }

  // Check if closest station is within threshold
  const closestStation = nearestStations[0];
  if (closestStation.distance < SINGLE_STATION_THRESHOLD_KM) {
    // Use single station data
    const result = await fetchLiveWeather(
      closestStation.latitude!,
      closestStation.longitude!,
      closestStation.stationId,
      forceRefresh
    );

    if (!result) return null;

    return {
      data: result.data,
      stations: [{
        stationId: closestStation.stationId,
        name: closestStation.name,
        distance: closestStation.distance,
        weight: 1,
      }],
      isSingleStation: true,
      isFromCache: result.isFromCache,
    };
  }

  // Fetch weather from all 3 stations in parallel
  const weatherPromises = nearestStations.map(station =>
    fetchLiveWeather(
      station.latitude!,
      station.longitude!,
      station.stationId,
      forceRefresh
    )
  );

  const results = await Promise.all(weatherPromises);

  // Filter out failed requests
  const validResults: Array<{ station: NearbyStation; data: LiveWeatherData; isFromCache: boolean }> = [];
  results.forEach((result, index) => {
    if (result) {
      validResults.push({
        station: nearestStations[index],
        data: result.data,
        isFromCache: result.isFromCache,
      });
    }
  });

  if (validResults.length === 0) {
    return null;
  }

  // If only one station returned data, use it
  if (validResults.length === 1) {
    return {
      data: validResults[0].data,
      stations: [{
        stationId: validResults[0].station.stationId,
        name: validResults[0].station.name,
        distance: validResults[0].station.distance,
        weight: 1,
      }],
      isSingleStation: true,
      isFromCache: validResults[0].isFromCache,
    };
  }

  // Calculate weights based on distances
  const distances = validResults.map(r => r.station.distance);
  const weights = calculateDistanceWeights(distances);

  // Interpolate numeric values
  let temperature = 0;
  let humidity = 0;
  let windSpeed = 0;

  validResults.forEach((result, index) => {
    temperature += result.data.temperature * weights[index];
    humidity += result.data.humidity * weights[index];
    windSpeed += result.data.windSpeed * weights[index];
  });

  // For weather condition, use the one from the closest station
  const closestResult = validResults[0];

  const interpolatedData: LiveWeatherData = {
    temperature: Math.round(temperature),
    humidity: Math.round(humidity),
    windSpeed: Math.round(windSpeed),
    weatherCode: closestResult.data.weatherCode,
    condition: closestResult.data.condition,
    conditionLabelKey: closestResult.data.conditionLabelKey,
    timestamp: new Date().toISOString(),
  };

  return {
    data: interpolatedData,
    stations: validResults.map((r, i) => ({
      stationId: r.station.stationId,
      name: r.station.name,
      distance: r.station.distance,
      weight: Math.round(weights[i] * 100) / 100,
    })),
    isSingleStation: false,
    isFromCache: validResults.some(r => r.isFromCache),
  };
}

/**
 * Interpolated sun chance result from multiple stations
 */
export interface InterpolatedSunChanceResult {
  sun_chance: number;
  sunny_days: number;
  total_days: number;
  confidence: 'high' | 'medium' | 'low';
  stations: Array<{
    stationId: string;
    name: string;
    distance: number;
    weight: number;
    sunChance: number;
  }>;
  isSingleStation: boolean;
}

/**
 * Calculates interpolated sun chance from nearest stations
 * - If closest station < 5km: uses only that station
 * - Otherwise: weighted average from 3 nearest stations
 */
export async function calculateInterpolatedSunChance(
  targetLat: number,
  targetLon: number,
  month: number,
  dayStart: number = 1,
  dayEnd: number = 31
): Promise<InterpolatedSunChanceResult | null> {
  // Find 3 nearest stations
  const nearestStations = findNearestStations(targetLat, targetLon, 3);

  if (nearestStations.length === 0) {
    return null;
  }

  // Check if closest station is within threshold
  const closestStation = nearestStations[0];
  if (closestStation.distance < SINGLE_STATION_THRESHOLD_KM) {
    const result = await calculateSunChance(closestStation.stationId, month, dayStart, dayEnd);

    return {
      sun_chance: result.sun_chance,
      sunny_days: result.sunny_days,
      total_days: result.total_days,
      confidence: result.confidence,
      stations: [{
        stationId: closestStation.stationId,
        name: closestStation.name,
        distance: closestStation.distance,
        weight: 1,
        sunChance: result.sun_chance,
      }],
      isSingleStation: true,
    };
  }

  // Fetch sun chance from all 3 stations in parallel
  const sunChancePromises = nearestStations.map(station =>
    calculateSunChance(station.stationId, month, dayStart, dayEnd)
  );

  const results = await Promise.all(sunChancePromises);

  // Filter out stations with no data
  const validResults: Array<{ station: NearbyStation; data: SunChanceResult }> = [];
  results.forEach((result, index) => {
    if (result.total_days > 0) {
      validResults.push({
        station: nearestStations[index],
        data: result,
      });
    }
  });

  if (validResults.length === 0) {
    return {
      sun_chance: 0,
      sunny_days: 0,
      total_days: 0,
      confidence: 'low',
      stations: [],
      isSingleStation: false,
    };
  }

  // If only one station has data, use it
  if (validResults.length === 1) {
    return {
      sun_chance: validResults[0].data.sun_chance,
      sunny_days: validResults[0].data.sunny_days,
      total_days: validResults[0].data.total_days,
      confidence: validResults[0].data.confidence,
      stations: [{
        stationId: validResults[0].station.stationId,
        name: validResults[0].station.name,
        distance: validResults[0].station.distance,
        weight: 1,
        sunChance: validResults[0].data.sun_chance,
      }],
      isSingleStation: true,
    };
  }

  // Calculate weights based on distances
  const distances = validResults.map(r => r.station.distance);
  const weights = calculateDistanceWeights(distances);

  // Interpolate sun chance
  let interpolatedSunChance = 0;
  let totalSunnyDays = 0;
  let totalDays = 0;

  validResults.forEach((result, index) => {
    interpolatedSunChance += result.data.sun_chance * weights[index];
    totalSunnyDays += result.data.sunny_days;
    totalDays += result.data.total_days;
  });

  // Determine confidence based on total data and number of stations
  let confidence: 'high' | 'medium' | 'low';
  const avgDaysPerStation = totalDays / validResults.length;
  if (avgDaysPerStation >= 50 && validResults.length >= 2) {
    confidence = 'high';
  } else if (avgDaysPerStation >= 20) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    sun_chance: Math.round(interpolatedSunChance),
    sunny_days: Math.round(totalSunnyDays / validResults.length),
    total_days: Math.round(totalDays / validResults.length),
    confidence,
    stations: validResults.map((r, i) => ({
      stationId: r.station.stationId,
      name: r.station.name,
      distance: r.station.distance,
      weight: Math.round(weights[i] * 100) / 100,
      sunChance: r.data.sun_chance,
    })),
    isSingleStation: false,
  };
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

  let data;
  try {
    const result = await supabase
      .from('weather_data')
      .select('date, sol, precip, tmax')
      .eq('station_id', stationId)
      .gte('date', tenYearsAgo.toISOString().split('T')[0]);

    if (result.error) {
      console.warn('[Offline] Cannot fetch best weeks data:', result.error.message);
      return [];
    }
    data = result.data;
  } catch (e) {
    console.warn('[Offline] Network error fetching best weeks data');
    return [];
  }

  if (!data || data.length === 0) {
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
  const weeklyData: { start: number; sunChance: number; avgTmax: number; score: number }[] = [];

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
      const sunChance = Math.round((totalSunny / totalDays) * 100);
      const avgTmax = tmaxCount > 0 ? Math.round((tmaxSum / tmaxCount) * 10) / 10 : 0;

      // Calculate weighted score
      let score = sunChance * 1.5; // Sun chance is primary factor (weight: 1.5)

      // Temperature bonus: ideal range 24-27°C gets max bonus
      if (avgTmax >= 24 && avgTmax <= 27) {
        score += 20; // Perfect temperature bonus
      } else if (avgTmax >= 22 && avgTmax <= 29) {
        score += 10; // Good temperature bonus
      } else if (avgTmax < 20 || avgTmax > 32) {
        score -= 10; // Too cold or too hot penalty
      }

      weeklyData.push({
        start: startDay,
        sunChance,
        avgTmax,
        score,
      });
    }
  }

  // Sort by score and get top 3
  const topWeeks = weeklyData
    .sort((a, b) => b.score - a.score)
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

// ─── DAY/NIGHT DETECTION ──────────────────────────────────────────────────────

/**
 * Checks if current time is nighttime (between 20:00 and 07:00)
 * Uses simple hour-based heuristic suitable for Canary Islands
 */
function isNightTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 20 || hour < 7;
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
 * @param code WMO weather code
 * @param isNight Whether it's currently nighttime (affects sunny -> clear-night mapping)
 */
export function mapWmoCode(code: number, isNight: boolean = false): WmoMapping {
  const mapping = WMO_CODE_MAP[code] ?? { condition: 'cloudy', labelKey: 'unknown' };

  // Convert sunny conditions to night variants when it's dark
  if (isNight) {
    if (mapping.condition === 'sunny') {
      return { condition: 'clear-night', labelKey: 'clearNight' };
    }
    if (mapping.condition === 'partly-sunny') {
      return { condition: 'partly-cloudy-night', labelKey: 'partlyCloudyNight' };
    }
  }

  return mapping;
}

// ─── AEMET API KEY ────────────────────────────────────────────────────────────

const AEMET_API_KEY = process.env.EXPO_PUBLIC_AEMET_API_KEY || '';

// ─── AEMET LIVE WEATHER (Primary source - official Spanish weather service) ───

interface AemetObservation {
  idema: string;      // Station ID
  fint: string;       // Timestamp (ISO format)
  ta?: number;        // Temperature (°C)
  hr?: number;        // Relative humidity (%)
  vv?: number;        // Wind speed (km/h) - average
  vmax?: number;      // Wind gusts (km/h) - maximum
  dv?: number;        // Wind direction (degrees)
  prec?: number;      // Precipitation (mm)
  vis?: number;       // Visibility (km)
  pres?: number;      // Pressure (hPa)
}

/**
 * Fetches live weather data directly from AEMET API
 * Returns the most recent observation for a given station
 * @param stationId AEMET station ID (e.g., "C430E" for Izaña)
 */
async function fetchAemetLiveWeather(
  stationId: string
): Promise<{ data: LiveWeatherData; timestamp: string } | null> {
  if (!AEMET_API_KEY) {
    console.warn('[AEMET] No API key configured');
    return null;
  }

  const TIMEOUT_MS = 10000;

  try {
    // Step 1: Get data URL from AEMET API
    const metaUrl = `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${stationId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'api_key': AEMET_API_KEY,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!metaResponse.ok) {
      console.warn(`[AEMET] Meta request failed: ${metaResponse.status}`);
      return null;
    }

    const metaData = await metaResponse.json();

    if (!metaData.datos) {
      console.warn('[AEMET] No data URL in response');
      return null;
    }

    // Step 2: Fetch actual observation data
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);

    const dataResponse = await fetch(metaData.datos, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller2.signal,
    });

    clearTimeout(timeoutId2);

    if (!dataResponse.ok) {
      console.warn(`[AEMET] Data request failed: ${dataResponse.status}`);
      return null;
    }

    const observations: AemetObservation[] = await dataResponse.json();

    if (!observations || observations.length === 0) {
      console.warn('[AEMET] No observations available');
      return null;
    }

    // Get the most recent observation (last in array)
    const latest = observations[observations.length - 1];

    // Map precipitation to weather condition
    const isNight = isNightTime();
    let condition: WeatherCondition = isNight ? 'clear-night' : 'sunny';
    let labelKey = isNight ? 'clearNight' : 'clearSky';
    let weatherCode = 0;

    if (latest.prec !== undefined && latest.prec > 0) {
      condition = 'rainy';
      labelKey = latest.prec > 5 ? 'heavyRain' : 'lightRain';
      weatherCode = latest.prec > 5 ? 65 : 61;
    } else if (latest.vis !== undefined && latest.vis < 1) {
      condition = 'foggy';
      labelKey = 'fog';
      weatherCode = 45;
    } else if (latest.hr !== undefined && latest.hr > 90) {
      condition = 'cloudy';
      labelKey = 'overcast';
      weatherCode = 3;
    } else if (latest.hr !== undefined && latest.hr > 70) {
      condition = isNight ? 'partly-cloudy-night' : 'partly-sunny';
      labelKey = isNight ? 'partlyCloudyNight' : 'partlyCloudy';
      weatherCode = 2;
    }

    const weatherData: LiveWeatherData = {
      temperature: latest.ta !== undefined ? Math.round(latest.ta) : 0,
      humidity: latest.hr !== undefined ? Math.round(latest.hr) : 0,
      windSpeed: latest.vv !== undefined ? Math.round(latest.vv) : 0,
      weatherCode,
      condition,
      conditionLabelKey: labelKey,
      timestamp: latest.fint,
    };

    console.log(`[AEMET] Live data: ${weatherData.temperature}°C, wind ${weatherData.windSpeed} km/h (${latest.fint})`);

    return { data: weatherData, timestamp: latest.fint };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[AEMET] Request timed out');
      } else {
        console.warn('[AEMET] Error:', error.message);
      }
    }
    return null;
  }
}

// ─── LIVE WEATHER (Open-Meteo API - Fallback) ─────────────────────────────────

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
 * Result from fetchLiveWeather including cache status
 */
export interface LiveWeatherResult {
  data: LiveWeatherData;
  isFromCache: boolean;
}

/**
 * Fetches current weather data - tries AEMET first (more accurate), then Open-Meteo as fallback
 * Falls back to cached data if network fails, then to mock data in dev mode
 * @param lat Latitude
 * @param lon Longitude
 * @param stationId Station ID for cache key and AEMET lookup
 * @param forceRefresh If true, skip cache fallback on error (for pull-to-refresh)
 * @returns LiveWeatherResult with data and cache status, or null if all fails
 */
export async function fetchLiveWeather(
  lat: number,
  lon: number,
  stationId?: string,
  forceRefresh: boolean = false
): Promise<LiveWeatherResult | null> {
  // Force mock data for UI testing
  if (USE_MOCK_DATA) {
    console.log('[DEV] Using mock weather data');
    return { data: getMockWeatherData(), isFromCache: false };
  }

  // Check in-memory rate limit cache first (15 min TTL)
  // Skip if forceRefresh is true (pull-to-refresh)
  if (stationId && !forceRefresh) {
    const rateLimitCached = getFromRateLimitCache(stationId);
    if (rateLimitCached) {
      console.log('[RateLimit] Using cached data (< 15 min old)');
      return { data: rateLimitCached, isFromCache: true };
    }
  }

  // ─── TRY AEMET FIRST (more accurate, official Spanish weather service) ───
  if (stationId && AEMET_API_KEY) {
    const aemetResult = await fetchAemetLiveWeather(stationId);
    if (aemetResult) {
      // Save to cache on success
      await saveWeatherToCache(stationId, aemetResult.data);
      saveToRateLimitCache(stationId, aemetResult.data);
      console.log('[AEMET] Using official AEMET data');
      return { data: aemetResult.data, isFromCache: false };
    }
    console.log('[AEMET] Failed, falling back to Open-Meteo');
  }

  // ─── FALLBACK TO OPEN-METEO ───────────────────────────────────────────────
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
      // Try cache fallback (unless force refresh)
      if (stationId && !forceRefresh) {
        const cached = await getWeatherFromCache(stationId);
        if (cached) {
          console.log('[Cache] Using cached weather data (API error)');
          return { data: cached, isFromCache: true };
        }
      }
      return __DEV__ ? { data: getMockWeatherData(), isFromCache: false } : null;
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.current) {
      console.warn('Open-Meteo API: No current data available');
      // Try cache fallback (unless force refresh)
      if (stationId && !forceRefresh) {
        const cached = await getWeatherFromCache(stationId);
        if (cached) {
          console.log('[Cache] Using cached weather data (no API data)');
          return { data: cached, isFromCache: true };
        }
      }
      return __DEV__ ? { data: getMockWeatherData(), isFromCache: false } : null;
    }

    const { condition, labelKey } = mapWmoCode(data.current.weather_code, isNightTime());

    const weatherData: LiveWeatherData = {
      temperature: Math.round(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: Math.round(data.current.wind_speed_10m),
      weatherCode: data.current.weather_code,
      condition,
      conditionLabelKey: labelKey,
      timestamp: data.current.time,
    };

    // Save to cache on success
    if (stationId) {
      await saveWeatherToCache(stationId, weatherData);
      saveToRateLimitCache(stationId, weatherData);
      console.log('[Cache] Weather data saved to cache');
    }

    return { data: weatherData, isFromCache: false };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Open-Meteo API: Request timed out');
      } else {
        console.warn('Open-Meteo API: Network error -', error.message);
      }
    }

    // Try cache fallback first (unless force refresh)
    if (stationId && !forceRefresh) {
      const cached = await getWeatherFromCache(stationId);
      if (cached) {
        console.log('[Cache] Using cached weather data (network error)');
        return { data: cached, isFromCache: true };
      }
    }

    // Fallback to mock data in development mode
    if (__DEV__) {
      console.log('[DEV] Network failed, using mock weather data');
      return { data: getMockWeatherData(), isFromCache: false };
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
