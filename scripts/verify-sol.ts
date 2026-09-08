/**
 * AEMET sol (sun-hours) coverage check (one-off helper).
 *
 * For each station id, fetches one recent year (2024) and reports how many
 * daily records carry a non-null `sol` value. Sun Chance needs sol coverage.
 *
 * Usage: npx ts-node scripts/verify-sol.ts B278 B893 B954 B986 6155A 6325O 7031 8025 8416
 */

import 'dotenv/config';

const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata/api';
const API_KEY = process.env.EXPO_PUBLIC_AEMET_API_KEY || process.env.AEMET_API_KEY || '';

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function formatAemetDate(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'UTC');
}

async function fetchPeriod(stationId: string, start: Date, end: Date): Promise<any[]> {
  const url = `${AEMET_BASE_URL}/valores/climatologicos/diarios/datos/fechaini/${formatAemetDate(start)}/fechafin/${formatAemetDate(end)}/estacion/${stationId}`;
  const res = await fetch(url, { headers: { api_key: API_KEY, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const meta = await res.json();
  if (meta.estado !== 200) throw new Error(`estado ${meta.estado}: ${meta.descripcion}`);
  await sleep(800);
  const dataRes = await fetch(meta.datos, { headers: { Accept: 'application/json' } });
  if (!dataRes.ok) throw new Error(`data ${dataRes.status}`);
  return dataRes.json();
}

function solNonNull(v: string | undefined): boolean {
  return !!v && v !== '' && v !== 'Ip' && v !== 'Acum';
}

async function main(): Promise<void> {
  if (!API_KEY) { console.error('ERROR: AEMET API key not set'); process.exit(1); }
  const ids = process.argv.slice(2);
  if (ids.length === 0) { console.error('Usage: verify-sol.ts <id> [<id> ...]'); process.exit(1); }

  console.log('station | year 2024 records | sol non-null | %sol | station name\n');
  for (const id of ids) {
    try {
      // Two ~6-month halves to stay under AEMET limit
      const h1 = await fetchPeriod(id, new Date(2024, 0, 1), new Date(2024, 5, 30, 23, 59, 59));
      await sleep(1200);
      const h2 = await fetchPeriod(id, new Date(2024, 6, 1), new Date(2024, 11, 31, 23, 59, 59));
      const rows = [...h1, ...h2];
      const withSol = rows.filter(r => solNonNull(r.sol)).length;
      const pct = rows.length ? Math.round((withSol / rows.length) * 100) : 0;
      const name = rows[0]?.nombre ?? '?';
      console.log(`${id.padEnd(7)} | ${String(rows.length).padStart(4)} | ${String(withSol).padStart(4)} | ${String(pct).padStart(3)}% | ${name}`);
    } catch (e) {
      console.log(`${id.padEnd(7)} | ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(1500);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
