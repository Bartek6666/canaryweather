-- Migration: Enable RLS on weather_data table
-- Fixes Supabase security alert "rls_disabled_in_public" (2026-05-11)
--
-- Context:
--   - weather_data was the only table flagged: RLS disabled, 0 policies.
--   - search_analytics already has RLS + 2 policies (configured earlier).
--   - Tables `stations` and `search_logs` from schema.sql were never created
--     in production — schema.sql is partially out of sync with the live DB.
--
-- Client access pattern (anon key, from src/):
--   - SELECT only — historical reads via weatherService.ts and ResultScreen.tsx
--   - No INSERT/UPDATE/DELETE from client
--   - All writes happen from import scripts using service_role key,
--     which bypasses RLS by design
--
-- Usage: Execute in Supabase SQL Editor or via supabase CLI
-- Date: 2026-05-14

-- Enable Row Level Security
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

-- Drop policy if re-running (idempotent)
DROP POLICY IF EXISTS "Weather data is publicly readable" ON weather_data;

-- SELECT policy: historical weather is non-sensitive public data.
-- No INSERT/UPDATE/DELETE policies → those operations are denied for
-- anon/authenticated roles. service_role bypasses RLS entirely, so
-- import scripts continue to work unchanged.
CREATE POLICY "Weather data is publicly readable"
    ON weather_data
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Verification
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'weather_data';

    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'weather_data';

    IF rls_enabled AND policy_count >= 1 THEN
        RAISE NOTICE 'Migration successful: RLS enabled, % policy(ies) active on weather_data', policy_count;
    ELSE
        RAISE EXCEPTION 'Migration failed: rls_enabled=%, policies=%', rls_enabled, policy_count;
    END IF;
END $$;
