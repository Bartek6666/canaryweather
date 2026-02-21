/**
 * Run database migration to add velmedia column
 *
 * Usage: npx ts-node scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not configured');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log('='.repeat(60));
  console.log('RUNNING MIGRATION: Add velmedia column');
  console.log('='.repeat(60));
  console.log();

  // Check if column already exists by trying to query it
  console.log('1. Checking if velmedia column already exists...');

  const { data: testData, error: testError } = await supabase
    .from('weather_data')
    .select('velmedia')
    .limit(1);

  if (!testError) {
    console.log('   ✓ Column velmedia already exists!');
    console.log();

    // Check how many records have wind data
    const { count } = await supabase
      .from('weather_data')
      .select('*', { count: 'exact', head: true })
      .not('velmedia', 'is', null);

    console.log(`   Records with wind data: ${count || 0}`);
    console.log();
    console.log('Migration already applied. No action needed.');
    console.log('='.repeat(60));
    return;
  }

  // Column doesn't exist - need to add it via Supabase Dashboard
  console.log('   ✗ Column velmedia does not exist yet.');
  console.log();
  console.log('2. To add the column, run this SQL in Supabase Dashboard:');
  console.log();
  console.log('   Go to: https://supabase.com/dashboard');
  console.log('   → Select your project');
  console.log('   → SQL Editor');
  console.log('   → New Query');
  console.log('   → Paste and run:');
  console.log();
  console.log('   ─────────────────────────────────────────────────────');
  console.log('   ALTER TABLE weather_data');
  console.log('   ADD COLUMN IF NOT EXISTS velmedia DECIMAL(4,1);');
  console.log('   ─────────────────────────────────────────────────────');
  console.log();
  console.log('3. After running the SQL, re-import data to populate wind values:');
  console.log('   npx ts-node scripts/import-all.ts');
  console.log();
  console.log('='.repeat(60));
}

runMigration().catch(console.error);
