# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canary Weather is a React Native/Expo mobile app for checking current and historical weather on the Canary Islands. It uses AEMET (Spanish meteorological service) as the primary data source, with 10 years of historical data from 19 weather stations stored in Supabase.

## Common Commands

```bash
# Development
npx expo start              # Start dev server
npx expo start --ios        # Run on iOS simulator
npx expo start --android    # Run on Android emulator

# Type checking
npx tsc --noEmit

# Data import (AEMET historical data)
npx ts-node scripts/fetch-station.ts <station_id>    # Fetch single station
npx ts-node scripts/upload-to-supabase.ts <station_id>  # Upload to Supabase
npx ts-node scripts/import-all.ts                    # Full import (~40 min)
```

## Architecture

### Data Flow

1. **Live Weather**: AEMET API → `weatherService.ts` → ResultScreen
   - Falls back to Open-Meteo if AEMET unavailable
   - 15-minute in-memory cache + 24-hour AsyncStorage cache

2. **Historical Data**: Supabase `weather_data` table → `getMonthlyStats()` → UI
   - 10 years of daily data per station (tmax, tmin, precip, sol, velmedia)

3. **Interpolation**: For locations between stations, weighted average from 3 nearest stations
   - `interpolateLiveWeather()` - live weather
   - `calculateInterpolatedSunChance()` - sun chance percentage
   - `calculateInterpolatedMonthlyStats()` - wind, rain, temperature averages

### Key Services (`src/services/weatherService.ts`)

- `fetchLiveWeather(lat, lon, stationId)` - Current conditions from AEMET/Open-Meteo
- `getMonthlyStats(stationId)` - Historical monthly averages from Supabase
- `calculateSunChance(stationId, month)` - Sun probability calculation
- `findNearestStations(lat, lon, count)` - Station proximity lookup
- `fetchCalimaStatus(lat, lon)` - Saharan dust detection via PM10

### Station Selection Logic

- Regular locations → nearest civilian station
- Mountain peaks → prefer high-altitude station (Izaña, Roque de los Muchachos)
- Fallback if high-altitude station >3x distance of nearest

### Database Schema (`supabase/schema.sql`)

- `weather_data`: Daily records (station_id, date, tmax, tmin, tavg, precip, sol, velmedia)
- `stations`: AEMET station metadata
- `search_logs`: Analytics

## Internationalization

4 languages in `src/i18n/locales/`: en.json, pl.json, es.json, de.json

Use `t('key')` from `useTranslation()` hook. Keys organized by section: common, search, result, months, weather.

## Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_AEMET_API_KEY=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Design System

Glassmorphism aesthetic defined in `src/constants/theme.ts`:
- Dark navy gradient background
- Glass cards with blur effect (`expo-blur`)
- Color tokens: `colors.sun`, `colors.rain`, `colors.tempHot`, `colors.tempCold`
