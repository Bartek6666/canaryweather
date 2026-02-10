/**
 * AEMET Full Import Orchestrator
 *
 * Sequentially fetches and uploads data for all stations
 * defined in locations_mapping.json.
 *
 * Usage: npx ts-node scripts/import-all.ts [--fetch-only] [--upload-only] [--dry-run]
 *
 * Options:
 *   --fetch-only   Only fetch data, don't upload to Supabase
 *   --upload-only  Only upload existing data from temp/
 *   --dry-run      Show what would be done without executing
 *   --station=ID   Process only specific station(s), comma-separated
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import 'dotenv/config';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface StationMapping {
  name: string;
  island: string;
  municipality: string;
  latitude: number;
  longitude: number;
  altitude: number;
  isNorthern: boolean;
  aliases: string[];
}

interface LocationsMapping {
  stations: Record<string, StationMapping>;
}

interface ImportResult {
  stationId: string;
  stationName: string;
  fetchSuccess: boolean;
  uploadSuccess: boolean;
  fetchDuration: number;
  uploadDuration: number;
  error?: string;
}

// Configuration
const CONFIG = {
  DELAY_BETWEEN_STATIONS_MS: 60000, // 60 seconds between stations
  MAPPING_PATH: path.join(__dirname, '..', 'src', 'constants', 'locations_mapping.json'),
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs a script as a child process
 */
function runScript(scriptPath: string, args: string[]): Promise<{ success: boolean; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const child = spawn('npx', ['ts-node', scriptPath, ...args], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        duration: Date.now() - startTime,
      });
    });

    child.on('error', (error) => {
      console.error(`Script error: ${error.message}`);
      resolve({
        success: false,
        duration: Date.now() - startTime,
      });
    });
  });
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  fetchOnly: boolean;
  uploadOnly: boolean;
  dryRun: boolean;
  specificStations: string[];
} {
  const args = process.argv.slice(2);

  return {
    fetchOnly: args.includes('--fetch-only'),
    uploadOnly: args.includes('--upload-only'),
    dryRun: args.includes('--dry-run'),
    specificStations: args
      .filter(arg => arg.startsWith('--station='))
      .flatMap(arg => arg.replace('--station=', '').split(',')),
  };
}

/**
 * Main orchestrator function
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  const options = parseArgs();

  console.log('\n' + '='.repeat(70));
  console.log('CANARY WEATHER - FULL IMPORT ORCHESTRATOR');
  console.log('='.repeat(70));

  // Load stations mapping
  if (!fs.existsSync(CONFIG.MAPPING_PATH)) {
    console.error(`ERROR: Mapping file not found: ${CONFIG.MAPPING_PATH}`);
    process.exit(1);
  }

  const mapping: LocationsMapping = JSON.parse(fs.readFileSync(CONFIG.MAPPING_PATH, 'utf-8'));
  let stationIds = Object.keys(mapping.stations);

  // Filter to specific stations if requested
  if (options.specificStations.length > 0) {
    stationIds = stationIds.filter(id => options.specificStations.includes(id));
    if (stationIds.length === 0) {
      console.error('ERROR: No matching stations found');
      console.log('Available stations:', Object.keys(mapping.stations).join(', '));
      process.exit(1);
    }
  }

  // Display configuration
  console.log('\nConfiguration:');
  console.log(`  Stations to process: ${stationIds.length}`);
  console.log(`  Delay between stations: ${CONFIG.DELAY_BETWEEN_STATIONS_MS / 1000}s`);
  console.log(`  Fetch only: ${options.fetchOnly}`);
  console.log(`  Upload only: ${options.uploadOnly}`);
  console.log(`  Dry run: ${options.dryRun}`);

  console.log('\nStations:');
  stationIds.forEach((id, index) => {
    const station = mapping.stations[id];
    console.log(`  ${index + 1}. ${id}: ${station.name} (${station.island})`);
  });

  // Estimate time
  const estimatedMinutes = stationIds.length * 2; // ~2 min per station for fetch
  console.log(`\nEstimated time: ~${estimatedMinutes} minutes`);

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes will be made');
    console.log('='.repeat(70) + '\n');
    return;
  }

  console.log('\nStarting import...\n');
  console.log('='.repeat(70));

  const results: ImportResult[] = [];
  const fetchScriptPath = path.join(__dirname, 'fetch-station.ts');
  const uploadScriptPath = path.join(__dirname, 'upload-to-supabase.ts');

  // Process each station
  for (let i = 0; i < stationIds.length; i++) {
    const stationId = stationIds[i];
    const station = mapping.stations[stationId];

    console.log(`\n[${ i + 1}/${stationIds.length}] Processing: ${stationId} - ${station.name}`);
    console.log('-'.repeat(50));

    const result: ImportResult = {
      stationId,
      stationName: station.name,
      fetchSuccess: true,
      uploadSuccess: true,
      fetchDuration: 0,
      uploadDuration: 0,
    };

    // Fetch data (unless upload-only)
    if (!options.uploadOnly) {
      console.log('\n[FETCH] Starting...');
      const fetchResult = await runScript(fetchScriptPath, [stationId]);
      result.fetchSuccess = fetchResult.success;
      result.fetchDuration = fetchResult.duration;

      if (!fetchResult.success) {
        result.error = 'Fetch failed';
        console.log(`[FETCH] Failed after ${formatDuration(fetchResult.duration)}`);
      } else {
        console.log(`[FETCH] Completed in ${formatDuration(fetchResult.duration)}`);
      }
    }

    // Upload data (unless fetch-only, and only if fetch succeeded)
    if (!options.fetchOnly && result.fetchSuccess) {
      console.log('\n[UPLOAD] Starting...');
      const uploadResult = await runScript(uploadScriptPath, [stationId]);
      result.uploadSuccess = uploadResult.success;
      result.uploadDuration = uploadResult.duration;

      if (!uploadResult.success) {
        result.error = (result.error ? result.error + ' & ' : '') + 'Upload failed';
        console.log(`[UPLOAD] Failed after ${formatDuration(uploadResult.duration)}`);
      } else {
        console.log(`[UPLOAD] Completed in ${formatDuration(uploadResult.duration)}`);
      }
    }

    results.push(result);

    // Delay before next station (except for the last one)
    if (i < stationIds.length - 1) {
      console.log(`\nWaiting ${CONFIG.DELAY_BETWEEN_STATIONS_MS / 1000}s before next station...`);
      await sleep(CONFIG.DELAY_BETWEEN_STATIONS_MS);
    }
  }

  // Summary
  const totalDuration = Date.now() - startTime;

  console.log('\n' + '='.repeat(70));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(70));

  console.log('\nResults by station:');
  console.log('-'.repeat(70));
  console.log('Station ID  | Station Name                    | Fetch  | Upload | Time');
  console.log('-'.repeat(70));

  results.forEach(r => {
    const fetchStatus = r.fetchSuccess ? 'OK' : 'FAIL';
    const uploadStatus = r.uploadSuccess ? 'OK' : 'FAIL';
    const totalTime = formatDuration(r.fetchDuration + r.uploadDuration);

    console.log(
      `${r.stationId.padEnd(11)} | ${r.stationName.substring(0, 31).padEnd(31)} | ${fetchStatus.padEnd(6)} | ${uploadStatus.padEnd(6)} | ${totalTime}`
    );
  });

  console.log('-'.repeat(70));

  const successfulFetches = results.filter(r => r.fetchSuccess).length;
  const successfulUploads = results.filter(r => r.uploadSuccess).length;
  const failedStations = results.filter(r => !r.fetchSuccess || !r.uploadSuccess);

  console.log(`\nTotal stations: ${results.length}`);
  console.log(`Successful fetches: ${successfulFetches}/${results.length}`);
  console.log(`Successful uploads: ${successfulUploads}/${results.length}`);
  console.log(`Total duration: ${formatDuration(totalDuration)}`);

  if (failedStations.length > 0) {
    console.log('\nFailed stations:');
    failedStations.forEach(r => {
      console.log(`  - ${r.stationId}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Exit with error code if any failures
  if (failedStations.length > 0) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
