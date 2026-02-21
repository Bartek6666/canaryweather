-- Migration: Add velmedia (wind speed) column to weather_data table
-- Run this migration on existing Supabase database to add wind data support
--
-- Usage: Execute in Supabase SQL Editor or via supabase cli
-- Date: 2024-02-21

-- Add velmedia column (average wind speed in km/h)
ALTER TABLE weather_data
ADD COLUMN IF NOT EXISTS velmedia DECIMAL(4,1);

-- Add comment for documentation
COMMENT ON COLUMN weather_data.velmedia IS 'Average wind speed (km/h) from AEMET velmedia field';

-- Verify column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'weather_data'
        AND column_name = 'velmedia'
    ) THEN
        RAISE NOTICE 'Migration successful: velmedia column added to weather_data table';
    ELSE
        RAISE EXCEPTION 'Migration failed: velmedia column was not created';
    END IF;
END $$;
