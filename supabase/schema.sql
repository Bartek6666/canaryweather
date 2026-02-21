-- Canary Weather History Database Schema
-- Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WEATHER DATA TABLE
-- Stores historical weather data from AEMET stations
-- ============================================
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    tmax DECIMAL(4,1),           -- Maximum temperature (°C)
    tmin DECIMAL(4,1),           -- Minimum temperature (°C)
    tavg DECIMAL(4,1),           -- Average temperature (°C)
    precip DECIMAL(5,1),         -- Precipitation (mm)
    sol DECIMAL(4,1),            -- Sun hours
    velmedia DECIMAL(4,1),       -- Average wind speed (km/h)
    is_interpolated BOOLEAN DEFAULT FALSE,  -- True if data was interpolated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique data per station and date
    CONSTRAINT unique_station_date UNIQUE (station_id, date)
);

-- Index for fast queries by station and date range
CREATE INDEX IF NOT EXISTS idx_weather_station_date
    ON weather_data (station_id, date DESC);

-- Index for sun chance calculations
CREATE INDEX IF NOT EXISTS idx_weather_sun_precip
    ON weather_data (station_id, date, sol, precip)
    WHERE sol IS NOT NULL OR precip IS NOT NULL;

-- ============================================
-- STATIONS TABLE
-- Metadata for AEMET weather stations
-- ============================================
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    island VARCHAR(50) NOT NULL,
    municipality VARCHAR(100),
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    altitude INTEGER NOT NULL,           -- Altitude in meters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geographic queries
CREATE INDEX IF NOT EXISTS idx_stations_location
    ON stations (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_stations_island
    ON stations (island);

-- ============================================
-- SEARCH LOGS TABLE
-- Analytics for user searches
-- ============================================
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query VARCHAR(255),              -- User search query
    user_lat DECIMAL(9,6),           -- User's latitude
    user_lon DECIMAL(9,6),           -- User's longitude
    detected_city VARCHAR(100),       -- City detected from coordinates
    selected_station_id VARCHAR(10),  -- Station that was selected
    date_from DATE,                   -- Start date of query
    date_to DATE,                     -- End date of query
    response_time_ms INTEGER,         -- API response time
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_search_logs_created
    ON search_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_city
    ON search_logs (detected_city);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Weather data: publicly readable
CREATE POLICY "Weather data is publicly readable"
    ON weather_data FOR SELECT
    USING (true);

-- Stations: publicly readable
CREATE POLICY "Stations are publicly readable"
    ON stations FOR SELECT
    USING (true);

-- Search logs: insert only (anonymous users can log searches)
CREATE POLICY "Anyone can insert search logs"
    ON search_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate sun chance for a date range
CREATE OR REPLACE FUNCTION calculate_sun_chance(
    p_station_id VARCHAR(10),
    p_month INTEGER,
    p_day_start INTEGER DEFAULT 1,
    p_day_end INTEGER DEFAULT 31
)
RETURNS TABLE (
    sunny_days INTEGER,
    total_days INTEGER,
    sun_chance DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH date_filter AS (
        SELECT
            date,
            sol,
            precip
        FROM weather_data
        WHERE station_id = p_station_id
            AND EXTRACT(MONTH FROM date) = p_month
            AND EXTRACT(DAY FROM date) BETWEEN p_day_start AND p_day_end
    )
    SELECT
        COUNT(*) FILTER (WHERE sol > 6 AND (precip = 0 OR precip IS NULL))::INTEGER AS sunny_days,
        COUNT(*)::INTEGER AS total_days,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND(
                    (COUNT(*) FILTER (WHERE sol > 6 AND (precip = 0 OR precip IS NULL))::DECIMAL / COUNT(*)) * 100,
                    2
                )
            ELSE 0
        END AS sun_chance
    FROM date_filter;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for weather_data
CREATE TRIGGER update_weather_data_updated_at
    BEFORE UPDATE ON weather_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================

-- Materialized view for quick sun chance access (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_sun_chance AS
SELECT
    station_id,
    EXTRACT(MONTH FROM date)::INTEGER AS month,
    COUNT(*) AS total_days,
    COUNT(*) FILTER (WHERE sol > 6 AND (precip = 0 OR precip IS NULL)) AS sunny_days,
    ROUND(
        (COUNT(*) FILTER (WHERE sol > 6 AND (precip = 0 OR precip IS NULL))::DECIMAL /
         NULLIF(COUNT(*), 0)) * 100,
        2
    ) AS sun_chance_percent
FROM weather_data
WHERE date >= CURRENT_DATE - INTERVAL '10 years'
GROUP BY station_id, EXTRACT(MONTH FROM date)
ORDER BY station_id, month;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_sun_chance
    ON mv_monthly_sun_chance (station_id, month);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_sun_chance_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sun_chance;
END;
$$ LANGUAGE plpgsql;
