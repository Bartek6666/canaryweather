/**
 * React hook for search analytics with timing support
 */

import { useRef, useCallback } from 'react';
import {
  trackAutocompleteSelect,
  trackGeocodeSelect,
  trackPopularSelect,
  trackIslandExpand,
  trackGpsSelect,
} from '../services/analyticsService';

export interface UseSearchAnalyticsReturn {
  startSearchTimer: () => void;
  getSearchDuration: () => number | undefined;
  trackAutocomplete: (params: {
    query: string;
    locationName: string;
    island: string;
    stationId: string;
    resultCount: number;
    resultPosition: number;
  }) => void;
  trackGeocode: (params: {
    query: string;
    locationName: string;
    island: string;
    stationId: string;
  }) => void;
  trackPopular: (params: {
    locationName: string;
    island: string;
    stationId: string;
  }) => void;
  trackIsland: (island: string) => void;
  trackGps: (params: {
    stationId: string;
    island: string;
    locationName?: string;
  }) => void;
}

export function useSearchAnalytics(): UseSearchAnalyticsReturn {
  const searchStartTime = useRef<number | null>(null);

  const startSearchTimer = useCallback(() => {
    searchStartTime.current = Date.now();
  }, []);

  const getSearchDuration = useCallback((): number | undefined => {
    if (!searchStartTime.current) return undefined;
    return Date.now() - searchStartTime.current;
  }, []);

  const trackAutocomplete = useCallback((params: {
    query: string;
    locationName: string;
    island: string;
    stationId: string;
    resultCount: number;
    resultPosition: number;
  }) => {
    trackAutocompleteSelect({
      ...params,
      durationMs: getSearchDuration(),
    });
    searchStartTime.current = null;
  }, [getSearchDuration]);

  const trackGeocode = useCallback((params: {
    query: string;
    locationName: string;
    island: string;
    stationId: string;
  }) => {
    trackGeocodeSelect(params);
    searchStartTime.current = null;
  }, []);

  const trackPopular = useCallback((params: {
    locationName: string;
    island: string;
    stationId: string;
  }) => {
    trackPopularSelect(params);
  }, []);

  const trackIsland = useCallback((island: string) => {
    trackIslandExpand(island);
  }, []);

  const trackGps = useCallback((params: {
    stationId: string;
    island: string;
    locationName?: string;
  }) => {
    trackGpsSelect(params);
  }, []);

  return {
    startSearchTimer,
    getSearchDuration,
    trackAutocomplete,
    trackGeocode,
    trackPopular,
    trackIsland,
    trackGps,
  };
}
