// Region grouping for islands/areas.
// The `island` field on each station maps to one of three regions.
// Trade winds (alisios/pasaty) only occur in the Canary Islands — this is used
// to keep trade-wind wording and per-region rankings correct outside the Canaries.

export type Region = 'canary' | 'balearic' | 'mainland';

const ISLAND_REGION: Record<string, Region> = {
  // Canary Islands
  'Tenerife': 'canary',
  'Gran Canaria': 'canary',
  'Fuerteventura': 'canary',
  'Lanzarote': 'canary',
  'La Palma': 'canary',
  'La Gomera': 'canary',
  'El Hierro': 'canary',
  // Balearic Islands
  'Mallorca': 'balearic',
  'Menorca': 'balearic',
  'Ibiza': 'balearic',
  'Formentera': 'balearic',
  // SE Spanish coast (mainland areas)
  'Costa del Sol': 'mainland',
  'Costa de Almería': 'mainland',
  'Costa Cálida': 'mainland',
  'Costa Blanca': 'mainland',
  'Costa de Valencia': 'mainland',
};

export function getRegionForIsland(island: string): Region {
  return ISLAND_REGION[island] ?? 'canary';
}

// The ranking row has a narrow name column. Mainland areas all start with
// "Costa " (untranslated across all languages), so abbreviate to "C." to fit
// the full name without truncation. Canary/Balearic names are already short.
export function formatRankingIslandName(name: string): string {
  return name.replace(/^Costa /, 'C. ');
}

// Maps an island/area name to its i18n key under `islands.*`.
export const ISLAND_TRANSLATION_KEYS: Record<string, string> = {
  'Tenerife': 'tenerife',
  'Gran Canaria': 'granCanaria',
  'Fuerteventura': 'fuerteventura',
  'Lanzarote': 'lanzarote',
  'La Palma': 'laPalma',
  'La Gomera': 'laGomera',
  'El Hierro': 'elHierro',
  'Mallorca': 'mallorca',
  'Menorca': 'menorca',
  'Ibiza': 'ibiza',
  'Formentera': 'formentera',
  'Costa del Sol': 'costaDelSol',
  'Costa de Almería': 'costaAlmeria',
  'Costa Cálida': 'costaCalida',
  'Costa Blanca': 'costaBlanca',
  'Costa de Valencia': 'costaValencia',
};
