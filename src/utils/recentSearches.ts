import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'recent_searches_v1';
const MAX_RECENT = 5;

export interface RecentSearch {
  stationId: string;
  locationName: string;
  island: string;
  lat?: number;
  lon?: number;
  isCoastal?: boolean;
  isHighAltitude?: boolean;
  isHighAltitudeFallback?: boolean;
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load recent searches:', error);
    return [];
  }
}

export async function addRecentSearch(item: RecentSearch): Promise<void> {
  try {
    const current = await getRecentSearches();
    // Drop any previous entry for the same place, then put this one on top
    const deduped = current.filter(
      (r) => !(r.stationId === item.stationId && r.locationName === item.locationName)
    );
    const next = [item, ...deduped].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to save recent search:', error);
  }
}
