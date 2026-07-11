/**
 * AEMET Station Discovery (one-off helper, not part of the app build)
 *
 * Lists AEMET stations in target provinces (Balearic Islands + SE Spanish coast)
 * so we can pick coastal candidates for the geographic expansion. Sorted by
 * altitude ascending (coastal stations first).
 *
 * Usage: npx ts-node scripts/discover-stations.ts
 */

import 'dotenv/config';

const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata/api';
const API_KEY = process.env.EXPO_PUBLIC_AEMET_API_KEY || process.env.AEMET_API_KEY || '';

// AEMET provincia field is uppercase, unaccented. Include known variants.
const TARGET_PROVINCES = [
  'BALEARES', 'ILLES BALEARS',
  'MALAGA',
  'ALMERIA',
  'MURCIA',
  'ALICANTE',
  'VALENCIA',
];

interface AemetStation {
  indicativo: string;
  nombre: string;
  provincia: string;
  latitud: string;  // DMS format e.g. "394333N"
  longitud: string; // DMS format e.g. "020430E"
  altitud: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Parses AEMET DMS coordinate ("394333N") to decimal degrees. */
function parseDms(value: string): number | null {
  const m = value.match(/^(\d{2,3})(\d{2})(\d{2})([NSEW])$/);
  if (!m) return null;
  const deg = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const hemi = m[4];
  let dec = deg + min / 60 + sec / 3600;
  if (hemi === 'S' || hemi === 'W') dec = -dec;
  return Math.round(dec * 10000) / 10000;
}

async function fetchInventory(): Promise<AemetStation[]> {
  const url = `${AEMET_BASE_URL}/valores/climatologicos/inventarioestaciones/todasestaciones`;
  const res = await fetch(url, { headers: { api_key: API_KEY, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`AEMET API error: ${res.status} ${res.statusText}`);
  const meta = await res.json();
  if (meta.estado !== 200) throw new Error(`AEMET estado ${meta.estado}: ${meta.descripcion}`);
  await sleep(1000);
  const dataRes = await fetch(meta.datos, { headers: { Accept: 'application/json' } });
  if (!dataRes.ok) throw new Error(`Failed to fetch inventory data: ${dataRes.status}`);
  return dataRes.json();
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('ERROR: EXPO_PUBLIC_AEMET_API_KEY not set in .env');
    process.exit(1);
  }

  console.log('Fetching AEMET station inventory...\n');
  const all = await fetchInventory();

  const wanted = new Set(TARGET_PROVINCES.map(p => p.toUpperCase()));
  const matches = all
    .filter(s => wanted.has((s.provincia || '').toUpperCase().trim()))
    .map(s => ({
      id: s.indicativo,
      name: s.nombre,
      provincia: s.provincia,
      lat: parseDms(s.latitud),
      lon: parseDms(s.longitud),
      altitud: parseInt(s.altitud, 10),
    }))
    .sort((a, b) => {
      if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia);
      return (a.altitud || 0) - (b.altitud || 0);
    });

  console.log(`Found ${matches.length} stations across target provinces:\n`);
  let currentProv = '';
  for (const s of matches) {
    if (s.provincia !== currentProv) {
      currentProv = s.provincia;
      console.log(`\n=== ${currentProv} ===`);
    }
    console.log(
      `  ${s.id.padEnd(7)} | alt ${String(s.altitud).padStart(4)}m | ${s.lat}, ${s.lon} | ${s.name}`
    );
  }
  console.log('\nDone. Pick coastal (low-altitude) candidates, then verify sol coverage.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
