/**
 * Search Analytics Service for Canary Weather
 *
 * Privacy-first analytics tracking:
 * - No precise GPS coordinates stored
 * - Anonymous session IDs (UUID, not device-linked)
 * - Country/region from device locale only
 */

import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getCurrentLanguage } from '../i18n';

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export type SearchType =
  | 'autocomplete'      // City autocomplete selection
  | 'geocode'           // Geocode fallback selection
  | 'popular'           // Popular destination click
  | 'island_expand'     // Island section expansion
  | 'gps';              // GPS location request

export interface SearchAnalyticsEvent {
  searchQuery?: string;
  searchType: SearchType;
  selectedLocationName?: string;
  selectedIsland?: string;
  selectedStationId?: string;
  searchResultCount?: number;
  resultPosition?: number;
  searchDurationMs?: number;
}

interface DeviceContext {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  appVersion: string;
}

interface UserContext {
  language: string;
  country: string | null;
}

interface StoredSession {
  sessionId: string;
  createdAt: number;
  lastActivityAt: number;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = '@canary_analytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 10;

// ─── SESSION MANAGEMENT ────────────────────────────────────────────────────────

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (stored) {
      const session: StoredSession = JSON.parse(stored);
      const now = Date.now();

      if (now - session.lastActivityAt < SESSION_TIMEOUT_MS) {
        session.lastActivityAt = now;
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        return session.sessionId;
      }
    }

    const newSession: StoredSession = {
      sessionId: generateSessionId(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    return newSession.sessionId;
  } catch (error) {
    console.warn('[Analytics] Session error:', error);
    return generateSessionId();
  }
}

// ─── DEVICE & USER CONTEXT ─────────────────────────────────────────────────────

function getDeviceContext(): DeviceContext {
  const platform = Platform.OS as 'ios' | 'android' | 'web';
  const osVersion = Platform.Version?.toString() ?? 'unknown';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return { platform, osVersion, appVersion };
}

function getUserContext(): UserContext {
  const language = getCurrentLanguage();
  const locales = Localization.getLocales();
  const country = locales[0]?.regionCode ?? null;

  return { language, country };
}

// ─── EVENT QUEUE ───────────────────────────────────────────────────────────────

interface QueuedEvent {
  event: SearchAnalyticsEvent;
  sessionId: string;
  deviceContext: DeviceContext;
  userContext: UserContext;
  timestamp: Date;
}

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEventQueue(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    const records = eventsToSend.map(({ event, sessionId, deviceContext, userContext, timestamp }) => ({
      session_id: sessionId,
      search_query: event.searchQuery ?? null,
      search_type: event.searchType,
      selected_location_name: event.selectedLocationName ?? null,
      selected_island: event.selectedIsland ?? null,
      selected_station_id: event.selectedStationId ?? null,
      user_language: userContext.language,
      user_country: userContext.country,
      platform: deviceContext.platform,
      os_version: deviceContext.osVersion,
      app_version: deviceContext.appVersion,
      search_result_count: event.searchResultCount ?? null,
      result_position: event.resultPosition ?? null,
      search_duration_ms: event.searchDurationMs ?? null,
      created_at: timestamp.toISOString(),
    }));

    const { error } = await supabase
      .from('search_analytics')
      .insert(records);

    if (error) {
      console.warn('[Analytics] Insert error:', error.message);
    }
  } catch (error) {
    console.warn('[Analytics] Flush error:', error);
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

export async function trackSearchEvent(event: SearchAnalyticsEvent): Promise<void> {
  try {
    const sessionId = await getOrCreateSessionId();
    const deviceContext = getDeviceContext();
    const userContext = getUserContext();

    eventQueue.push({
      event,
      sessionId,
      deviceContext,
      userContext,
      timestamp: new Date(),
    });

    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      await flushEventQueue();
    } else if (!flushTimer) {
      flushTimer = setTimeout(() => flushEventQueue(), FLUSH_INTERVAL_MS);
    }
  } catch (error) {
    console.warn('[Analytics] Track error:', error);
  }
}

export async function flushAnalytics(): Promise<void> {
  await flushEventQueue();
}

// ─── CONVENIENCE FUNCTIONS ─────────────────────────────────────────────────────

export function trackAutocompleteSelect(params: {
  query: string;
  locationName: string;
  island: string;
  stationId: string;
  resultCount: number;
  resultPosition: number;
  durationMs?: number;
}): void {
  trackSearchEvent({
    searchType: 'autocomplete',
    searchQuery: params.query,
    selectedLocationName: params.locationName,
    selectedIsland: params.island,
    selectedStationId: params.stationId,
    searchResultCount: params.resultCount,
    resultPosition: params.resultPosition,
    searchDurationMs: params.durationMs,
  });
}

export function trackGeocodeSelect(params: {
  query: string;
  locationName: string;
  island: string;
  stationId: string;
}): void {
  trackSearchEvent({
    searchType: 'geocode',
    searchQuery: params.query,
    selectedLocationName: params.locationName,
    selectedIsland: params.island,
    selectedStationId: params.stationId,
  });
}

export function trackPopularSelect(params: {
  locationName: string;
  island: string;
  stationId: string;
}): void {
  trackSearchEvent({
    searchType: 'popular',
    selectedLocationName: params.locationName,
    selectedIsland: params.island,
    selectedStationId: params.stationId,
  });
}

export function trackIslandExpand(island: string): void {
  trackSearchEvent({
    searchType: 'island_expand',
    selectedIsland: island,
  });
}

export function trackGpsSelect(params: {
  stationId: string;
  island: string;
  locationName?: string;
}): void {
  trackSearchEvent({
    searchType: 'gps',
    selectedStationId: params.stationId,
    selectedIsland: params.island,
    selectedLocationName: params.locationName ?? 'GPS Location',
  });
}
