// Weather data types for Canary Weather History app

export interface WeatherData {
  id?: string;
  station_id: string;
  date: string; // ISO date format YYYY-MM-DD
  tmax: number | null;
  tmin: number | null;
  tavg: number | null;
  precip: number | null;
  sol: number | null; // Sun hours
  is_interpolated: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Station {
  id?: string;
  station_id: string;
  name: string;
  island: Island;
  municipality: string;
  latitude: number;
  longitude: number;
  altitude: number;
  is_active: boolean;
  isNorthern: boolean;
  aliases: string[];
}

export interface StationMapping {
  name: string;
  island: Island;
  municipality: string;
  latitude: number;
  longitude: number;
  altitude: number;
  isNorthern: boolean;
  isHighAltitude?: boolean;
  aliases: string[];
}

export interface SearchLog {
  id?: string;
  query: string | null;
  user_lat: number | null;
  user_lon: number | null;
  detected_city: string | null;
  selected_station_id: string | null;
  date_from: string | null;
  date_to: string | null;
  response_time_ms: number | null;
  created_at?: string;
}

export interface SunChanceResult {
  sunny_days: number;
  total_days: number;
  sun_chance: number; // Percentage 0-100
  confidence: 'high' | 'medium' | 'low';
}

export interface MonthlyStats {
  month: number;
  avg_tmax: number;
  avg_tmin: number;
  avg_precip: number;
  avg_sol: number;
  sun_chance: number;
  rain_days: number;
  total_days: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface WeatherQuery {
  stationId: string;
  dateRange?: DateRange;
  month?: number;
  dayStart?: number;
  dayEnd?: number;
}

export type Island =
  | 'Tenerife'
  | 'Gran Canaria'
  | 'Lanzarote'
  | 'Fuerteventura'
  | 'La Palma'
  | 'La Gomera'
  | 'El Hierro';

export interface IslandConfig {
  mainStation: string;
  stations: string[];
  backgroundImage: string;
}

export interface City {
  name: string;
  island: Island;
  coords: {
    lat: number;
    lon: number;
  };
  isHighAltitude?: boolean;
}

export interface LocationsMapping {
  version: string;
  lastUpdated: string;
  description: string;
  stations: Record<string, StationMapping>;
  islands: Record<Island, IslandConfig>;
  cities: City[];
  altitudeCorrection: {
    description: string;
    lapseRate: number;
    unit: string;
  };
  sunChanceConfig: {
    minSunHours: number;
    maxPrecip: number;
    northernMultiplier: number;
    description: string;
  };
}

// AEMET API response types
export interface AemetApiResponse<T> {
  descripcion: string;
  estado: number;
  datos: string; // URL to fetch actual data
  metadatos: string;
}

export interface AemetDailyData {
  fecha: string; // Date YYYY-MM-DD
  indicativo: string; // Station ID
  nombre: string; // Station name
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
  horaracha: string;
  dir: string;
}

// Live weather data from Open-Meteo API
export type WeatherCondition = 'sunny' | 'partly-sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'clear-night' | 'partly-cloudy-night';

export interface LiveWeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  condition: WeatherCondition;
  conditionLabelKey: string; // i18n key for weather.* translation
  timestamp: string;
}
