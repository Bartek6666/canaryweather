# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Implementation Notes

**IMPORTANT:** Na początku każdej sesji sprawdź plik `docs/implementation-notes.md` - zawiera historię decyzji implementacyjnych i notatki z poprzednich sesji.

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

---

## Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. These guidelines bias toward caution over speed.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
