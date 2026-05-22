-- Canary Weather Database Schema
-- Source of truth for Supabase production state as of 2026-05-14.
-- Reflects what's in the live DB after migrations 001-003 have been applied.
--
-- Convention: this file is the current snapshot. Schema changes go via
-- numbered files in supabase/migrations/, then this file is updated to match.

-- ============================================
-- WEATHER_DATA
-- Historical daily weather records from AEMET stations.
-- Written by import scripts (service_role, bypasses RLS).
-- Read by the app via anon key (SELECT policy below).
-- ============================================
CREATE TABLE IF NOT EXISTS weather_data (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      text NOT NULL,
    date            date NOT NULL,
    tmax            numeric,                 -- max temperature (°C)
    tmin            numeric,                 -- min temperature (°C)
    tavg            numeric,                 -- avg temperature (°C)
    precip          numeric,                 -- precipitation (mm)
    sol             numeric,                 -- sun hours
    velmedia        numeric,                 -- avg wind speed (km/h; AEMET m/s × 3.6)
    is_interpolated boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),

    CONSTRAINT weather_data_station_id_date_key UNIQUE (station_id, date)
);

-- RLS: public read-only (migration 002, 2026-05-14)
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather data is publicly readable"
    ON weather_data FOR SELECT
    TO anon, authenticated
    USING (true);

-- ============================================
-- SEARCH_ANALYTICS
-- Privacy-first usage analytics: anonymous session IDs, no precise GPS.
-- Written by the app (anon INSERT). Reads denied to anon — analytics
-- are inspected only via service_role / Supabase Dashboard.
-- ============================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id             uuid NOT NULL,
    search_query           text,
    search_type            text NOT NULL,
    selected_location_name text,
    selected_island        text,
    selected_station_id    text,
    user_language          text NOT NULL,
    user_country           text,
    platform               text NOT NULL,
    os_version             text,
    app_version            text,
    search_result_count    integer,
    result_position        integer,
    search_duration_ms     integer,
    created_at             timestamptz DEFAULT now(),

    -- Whitelist of valid event types — keep in sync with SearchType
    -- in src/services/analyticsService.ts
    CONSTRAINT search_analytics_search_type_check
        CHECK (search_type IN (
            'autocomplete',
            'geocode',
            'popular',
            'island_expand',
            'gps',
            'result_view',
            'wind_details_view',
            'wind_stability_view',
            'rain_details_view',
            'alert_details_view'
        ))
);

CREATE INDEX IF NOT EXISTS idx_analytics_created
    ON search_analytics (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_island
    ON search_analytics (selected_island);
CREATE INDEX IF NOT EXISTS idx_analytics_location
    ON search_analytics (selected_location_name);

-- RLS: anon can insert events, cannot read them
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow inserts"
    ON search_analytics FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Deny reads"
    ON search_analytics FOR SELECT
    TO anon
    USING (false);
