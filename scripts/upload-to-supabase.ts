/**
 * Supabase Data Uploader
 *
 * Uploads weather data from temp/ JSON files to Supabase
 * using batch upsert to avoid duplicates.
 *
 * Usage: npx ts-node scripts/upload-to-supabase.ts [station_id]
 * Example: npx ts-node scripts/upload-to-supabase.ts C418Y
 *          npx ts-node scripts/upload-to-supabase.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface WeatherRecord {
  station_id: string;
  date: string;
  tmax: number | null;
  tmin: number | null;
  tavg: number | null;
  precip: number | null;
  sol: number | null;
  velmedia: number | null;  // Average wind speed (km/h)
  is_interpolated: boolean;
}

interface StationDataFile {
  station_id: string;
  fetched_at: string;
  date_range: {
    start: string;
    end: string;
  };
  total_records: number;
  interpolated_records: number;
  errors?: Array<{ year: number; error: string }>;
  data: WeatherRecord[];
}

interface UploadResult {
  stationId: string;
  totalRecords: number;
  uploadedRecords: number;
  errors: number;
  duration: number;
}

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  BATCH_SIZE: 500,
  TEMP_DIR: path.join(__dirname, '..', 'temp'),
};

// Validate Supabase config
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not configured');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/**
 * Splits array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Uploads a batch of records to Supabase
 */
async function uploadBatch(
  records: WeatherRecord[],
  batchNumber: number,
  totalBatches: number
): Promise<{ success: number; errors: number }> {
  try {
    const { data, error } = await supabase
      .from('weather_data')
      .upsert(records, {
        onConflict: 'station_id,date',
        ignoreDuplicates: false, // Update existing records
      })
      .select('id');

    if (error) {
      console.error(`  Batch ${batchNumber}/${totalBatches} failed: ${error.message}`);
      return { success: 0, errors: records.length };
    }

    const successCount = data?.length || records.length;
    console.log(`  Batch ${batchNumber}/${totalBatches}: ${successCount} records uploaded`);
    return { success: successCount, errors: 0 };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  Batch ${batchNumber}/${totalBatches} error: ${message}`);
    return { success: 0, errors: records.length };
  }
}

/**
 * Uploads all data for a single station
 */
async function uploadStation(stationId: string): Promise<UploadResult> {
  const startTime = Date.now();
  const filePath = path.join(CONFIG.TEMP_DIR, `station_${stationId}.json`);

  console.log(`\nUploading station: ${stationId}`);
  console.log('-'.repeat(40));

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    console.error(`  Run 'npx ts-node scripts/fetch-station.ts ${stationId}' first`);
    return {
      stationId,
      totalRecords: 0,
      uploadedRecords: 0,
      errors: 1,
      duration: Date.now() - startTime,
    };
  }

  // Read and parse file
  let stationData: StationDataFile;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    stationData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`  ERROR: Failed to parse file: ${error}`);
    return {
      stationId,
      totalRecords: 0,
      uploadedRecords: 0,
      errors: 1,
      duration: Date.now() - startTime,
    };
  }

  const records = stationData.data;
  console.log(`  Total records: ${records.length}`);
  console.log(`  Batch size: ${CONFIG.BATCH_SIZE}`);

  if (records.length === 0) {
    console.log('  No records to upload');
    return {
      stationId,
      totalRecords: 0,
      uploadedRecords: 0,
      errors: 0,
      duration: Date.now() - startTime,
    };
  }

  // Split into batches
  const batches = chunk(records, CONFIG.BATCH_SIZE);
  console.log(`  Batches: ${batches.length}`);

  let totalSuccess = 0;
  let totalErrors = 0;

  // Upload batches
  for (let i = 0; i < batches.length; i++) {
    const result = await uploadBatch(batches[i], i + 1, batches.length);
    totalSuccess += result.success;
    totalErrors += result.errors;
  }

  const duration = Date.now() - startTime;

  console.log('-'.repeat(40));
  console.log(`  Completed: ${totalSuccess}/${records.length} records`);
  console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);

  return {
    stationId,
    totalRecords: records.length,
    uploadedRecords: totalSuccess,
    errors: totalErrors,
    duration,
  };
}

/**
 * Gets all station files in temp directory
 */
function getAvailableStationFiles(): string[] {
  if (!fs.existsSync(CONFIG.TEMP_DIR)) {
    return [];
  }

  return fs.readdirSync(CONFIG.TEMP_DIR)
    .filter(file => file.startsWith('station_') && file.endsWith('.json'))
    .map(file => file.replace('station_', '').replace('.json', ''));
}

/**
 * Main upload function
 */
async function main(): Promise<void> {
  const arg = process.argv[2];

  console.log('\n' + '='.repeat(60));
  console.log('SUPABASE DATA UPLOADER');
  console.log('='.repeat(60));

  let stationsToUpload: string[] = [];

  if (!arg) {
    // No argument - show usage
    console.log('\nUsage:');
    console.log('  npx ts-node scripts/upload-to-supabase.ts <station_id>');
    console.log('  npx ts-node scripts/upload-to-supabase.ts --all');
    console.log('\nAvailable station files in temp/:');

    const available = getAvailableStationFiles();
    if (available.length === 0) {
      console.log('  (none - run fetch-station.ts first)');
    } else {
      available.forEach(id => console.log(`  - ${id}`));
    }

    process.exit(1);

  } else if (arg === '--all') {
    // Upload all available stations
    stationsToUpload = getAvailableStationFiles();

    if (stationsToUpload.length === 0) {
      console.log('\nNo station files found in temp/');
      console.log('Run fetch-station.ts first to download data');
      process.exit(1);
    }

    console.log(`\nUploading all ${stationsToUpload.length} stations...`);

  } else {
    // Upload specific station
    stationsToUpload = [arg];
  }

  // Upload each station
  const results: UploadResult[] = [];

  for (const stationId of stationsToUpload) {
    const result = await uploadStation(stationId);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(60));

  const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);
  const totalUploaded = results.reduce((sum, r) => sum + r.uploadedRecords, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nStations processed: ${results.length}`);
  console.log(`Total records: ${totalRecords}`);
  console.log(`Successfully uploaded: ${totalUploaded}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (totalErrors > 0) {
    console.log('\nStations with errors:');
    results
      .filter(r => r.errors > 0)
      .forEach(r => console.log(`  - ${r.stationId}: ${r.errors} errors`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
