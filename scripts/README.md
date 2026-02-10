# AEMET Data Import Scripts

Scripts for fetching historical weather data from AEMET OpenData API and uploading to Supabase.

## Prerequisites

1. **AEMET API Key**: Get your free API key at https://opendata.aemet.es/centrodedescargas/altaUsuario

2. **Supabase Project**: Create a project at https://supabase.com and run the schema from `supabase/schema.sql`

3. **Environment Variables**: Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env`:
```
AEMET_API_KEY=your-aemet-api-key-here
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Quick Start: Test with Single Station

To test the import system with a single station (recommended before full import):

```bash
# 1. Fetch data for Adeje (South Tenerife - most popular tourist area)
npx ts-node scripts/fetch-station.ts C418Y

# 2. Upload to Supabase
npx ts-node scripts/upload-to-supabase.ts C418Y
```

This will:
- Fetch 10 years of weather data (2016-2026)
- Apply 10-second delays between API calls
- Retry on 500/503/429 errors
- Interpolate missing temperatures
- Save to `temp/station_C418Y.json`
- Upload in batches of 500 records

## Scripts Overview

### 1. fetch-station.ts

Fetches historical weather data from AEMET for a single station.

```bash
npx ts-node scripts/fetch-station.ts <station_id>
```

**Features:**
- Fetches data year by year (2016-2026)
- 10-second delay between API requests
- Automatic retry (3x) on server errors with 30s wait
- Linear interpolation for missing `tmed` values
- Saves to `temp/station_{id}.json`

**Example:**
```bash
# Fetch Maspalomas (Gran Canaria)
npx ts-node scripts/fetch-station.ts C659I

# Fetch Puerto de la Cruz (North Tenerife)
npx ts-node scripts/fetch-station.ts C430E
```

### 2. upload-to-supabase.ts

Uploads fetched data to Supabase.

```bash
# Upload single station
npx ts-node scripts/upload-to-supabase.ts C418Y

# Upload all fetched stations
npx ts-node scripts/upload-to-supabase.ts --all
```

**Features:**
- Batch upsert (500 records per batch)
- Handles duplicates via upsert
- Progress reporting

### 3. import-all.ts

Orchestrates full import for all stations.

```bash
# Full import (fetch + upload all stations)
npx ts-node scripts/import-all.ts

# Fetch only (no upload)
npx ts-node scripts/import-all.ts --fetch-only

# Upload only (use existing temp/ files)
npx ts-node scripts/import-all.ts --upload-only

# Dry run (show what would be done)
npx ts-node scripts/import-all.ts --dry-run

# Specific stations only
npx ts-node scripts/import-all.ts --station=C418Y,C659I
```

**Features:**
- 60-second delay between stations (API rate limit protection)
- Progress tracking
- Summary report

## Available Stations

| Station ID | Name | Island | Area |
|------------|------|--------|------|
| C418Y | Adeje | Tenerife | Costa Adeje, Las Americas |
| C429I | Tenerife Sur | Tenerife | El Médano |
| C430E | Puerto de la Cruz | Tenerife | North coast |
| C447A | La Laguna | Tenerife | Airport/North |
| C449C | Santa Cruz | Tenerife | Capital |
| C458C | Izaña | Tenerife | Teide (2371m) |
| C419I | Guía de Isora | Tenerife | West coast |
| C659I | Maspalomas | Gran Canaria | South |
| C649I | Gran Canaria Airport | Gran Canaria | East |
| C641A | Las Palmas | Gran Canaria | Capital |
| C658O | Mogán | Gran Canaria | Puerto Rico |
| C029O | Lanzarote | Lanzarote | All island |
| C039O | Haría | Lanzarote | North |
| C129E | Fuerteventura | Fuerteventura | All island |
| C139E | La Palma | La Palma | All island |
| C139I | Roque Muchachos | La Palma | Observatory |
| C109U | La Gomera | La Gomera | All island |
| C119Y | El Hierro | El Hierro | All island |

## Estimated Time

- **Single station**: ~2 minutes (10 years × 10s delay)
- **All stations (18)**: ~40 minutes (including 60s between stations)

## Troubleshooting

### "AEMET API error: 401"
Your API key is invalid or missing. Check `.env` file.

### "AEMET API error: 429"
Too many requests. The script will automatically retry after 30 seconds.

### "No data returned"
Some stations may not have data for certain periods. This is normal.

### "Supabase error: relation does not exist"
Run the schema first:
```sql
-- In Supabase SQL Editor, paste contents of supabase/schema.sql
```

## Data Structure

Fetched JSON files have this structure:
```json
{
  "station_id": "C418Y",
  "fetched_at": "2024-01-15T10:30:00.000Z",
  "date_range": { "start": "2016-01-01", "end": "2026-01-01" },
  "total_records": 3287,
  "interpolated_records": 45,
  "data": [
    {
      "station_id": "C418Y",
      "date": "2016-01-01",
      "tmax": 22.5,
      "tmin": 16.2,
      "tavg": 19.3,
      "precip": 0,
      "sol": 8.5,
      "is_interpolated": false
    }
  ]
}
```
