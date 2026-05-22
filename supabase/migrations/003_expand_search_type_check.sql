-- Migration: Expand search_type CHECK constraint on search_analytics
-- Fixes silent INSERT failures for analytics events added after the table was created.
--
-- Context:
--   The original CHECK constraint only whitelisted 6 search_type values.
--   The app (analyticsService.ts) defines 10 valid types; the 4 newer ones
--   (wind_details_view, wind_stability_view, rain_details_view,
--   alert_details_view) silently fail INSERT and surface only as
--   console.warn('[Analytics] Insert error: ...').
--   This means analytics data for those events has been lost.
--
-- Usage: Execute in Supabase SQL Editor or via supabase CLI
-- Date: 2026-05-14

-- Drop old constraint (idempotent — won't error if it doesn't exist)
ALTER TABLE search_analytics
    DROP CONSTRAINT IF EXISTS search_analytics_search_type_check;

-- Recreate with the full whitelist matching SearchType in analyticsService.ts
ALTER TABLE search_analytics
    ADD CONSTRAINT search_analytics_search_type_check
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
    ));

-- Verification
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'search_analytics_search_type_check';

    IF constraint_def LIKE '%alert_details_view%' THEN
        RAISE NOTICE 'Migration successful: CHECK constraint now includes all 10 event types';
    ELSE
        RAISE EXCEPTION 'Migration failed: constraint definition does not include new types — %', constraint_def;
    END IF;
END $$;
