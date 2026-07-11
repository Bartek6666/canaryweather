import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Keyboard,
  Alert,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { spacing, glassTokens, borderRadius, light, fonts } from '../constants/theme';
import locationsMapping from '../constants/locations_mapping.json';
import { findNearestStations, findNearestStation, NearbyStation } from '../services/weatherService';
import { GlassCard, LanguageSwitcher, LocationPrompt, SunlyIcon } from '../components';
import { City } from '../types/weather';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';

const LOCATION_PROMPT_KEY = 'location_prompt_dismissed';
const MAX_CANARY_DISTANCE_KM = 150;
// Redesign toggle: popular destinations as flat list (true) vs island grid (false)
const USE_PLACE_LIST = false;

// Background gradient (image removed)

type RootStackParamList = {
  Search: undefined;
  Result: {
    stationId: string;
    locationName?: string;
    locationCoords?: { lat: number; lon: number };
    isHighAltitudeFallback?: boolean;
    isCoastal?: boolean;
    isHighAltitude?: boolean;
  };
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

interface CityResult {
  name: string;
  island: string;
  coords: { lat: number; lon: number };
  score: number;
  isHighAltitude?: boolean;
  isCoastal?: boolean;
}

type SearchMode = 'cities' | 'geocode' | 'no_results' | 'idle';

type IslandTile = {
  key: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  places: { name: string; stationId: string; coords: { lat: number; lon: number } }[];
};

const { width, height } = Dimensions.get('window');

// Time gradient is resolved via theme helper

// Normalize text by removing diacritics (accents) for search
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function fuzzyMatch(query: string, target: string): number {
  const q = normalizeText(query);
  const t = normalizeText(target);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;
  return 0;
}

type LocationResult =
  | { type: 'success'; lat: number; lon: number }
  | { type: 'services_disabled' }
  | { type: 'unavailable' };

const LOCATION_TIMEOUT_MS = 10_000;

async function getCurrentLocationWithFallback(): Promise<LocationResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return { type: 'services_disabled' };
  } catch (e) {
    console.warn('[Location] hasServicesEnabledAsync failed:', e);
  }

  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('location-timeout')), LOCATION_TIMEOUT_MS)
      ),
    ]);
    return { type: 'success', lat: loc.coords.latitude, lon: loc.coords.longitude };
  } catch (currentError) {
    console.warn('[Location] getCurrentPositionAsync failed, trying last known:', currentError);
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        return { type: 'success', lat: lastKnown.coords.latitude, lon: lastKnown.coords.longitude };
      }
    } catch (lastKnownError) {
      console.error('[Location] getLastKnownPositionAsync failed:', lastKnownError);
    }
    return { type: 'unavailable' };
  }
}

// Search cities from the cities database
function searchCities(query: string): CityResult[] {
  if (!query || query.length < 2) return [];
  const cities = locationsMapping.cities as City[];
  const results: CityResult[] = [];

  for (const city of cities) {
    let bestScore = 0;
    // Search by city name
    bestScore = Math.max(bestScore, fuzzyMatch(query, city.name));
    // Search by island name
    const islandScore = fuzzyMatch(query, city.island);
    if (islandScore > bestScore) bestScore = islandScore;

    if (bestScore > 30) {
      results.push({
        name: city.name,
        island: city.island,
        coords: city.coords,
        score: bestScore,
        isHighAltitude: city.isHighAltitude,
        isCoastal: city.isCoastal,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

export default function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const {
    startSearchTimer,
    trackAutocomplete,
    trackGeocode,
    trackPopular,
    trackIsland,
    trackGps,
  } = useSearchAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [geocodeResults, setGeocodeResults] = useState<NearbyStation[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('idle');
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [geocodeCoords, setGeocodeCoords] = useState<{ lat: number; lon: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const placesRef = useRef<View>(null);
  const shouldScrollToPlaces = useRef(false);

  // Location prompt state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isLocationPromptLoading, setIsLocationPromptLoading] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Check if location prompt should be shown on mount
  useEffect(() => {
    const checkLocationPrompt = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(LOCATION_PROMPT_KEY);
        if (!dismissed) {
          // Small delay for better UX
          setTimeout(() => setShowLocationPrompt(true), 800);
        }
      } catch (error) {
        console.warn('Failed to check location prompt status:', error);
      }
    };
    checkLocationPrompt();
  }, []);

  // City search (instant, 150ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Start timer when user begins typing
      if (searchQuery.length === 1) {
        startSearchTimer();
      }
      const results = searchCities(searchQuery);
      setCityResults(results);

      if (results.length > 0) {
        setSearchMode('cities');
        setGeocodeResults([]);
        setIsGeocodingLoading(false);
        if (geocodeTimerRef.current) {
          clearTimeout(geocodeTimerRef.current);
          geocodeTimerRef.current = null;
        }
      } else if (searchQuery.length >= 3) {
        setSearchMode('idle');
        setIsGeocodingLoading(true);
      } else if (searchQuery.length > 0) {
        setSearchMode('idle');
        setGeocodeResults([]);
      } else {
        setSearchMode('idle');
        setGeocodeResults([]);
        setIsGeocodingLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Geocoding fallback (500ms debounce, fires only when no city results)
  useEffect(() => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }

    if (searchQuery.length < 3 || cityResults.length > 0) {
      setIsGeocodingLoading(false);
      return;
    }

    setIsGeocodingLoading(true);
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const locations = await Location.geocodeAsync(searchQuery);
        if (locations.length > 0) {
          const { latitude, longitude } = locations[0];
          const nearby = findNearestStations(latitude, longitude, 3);
          if (nearby.length > 0 && nearby[0].distance <= 150) {
            setGeocodeResults(nearby);
            setGeocodeQuery(searchQuery);
            setGeocodeCoords({ lat: latitude, lon: longitude });
            setSearchMode('geocode');
          } else {
            setGeocodeResults([]);
            setSearchMode('no_results');
          }
        } else {
          setGeocodeResults([]);
          setSearchMode('no_results');
        }
      } catch {
        setGeocodeResults([]);
        setSearchMode('no_results');
      } finally {
        setIsGeocodingLoading(false);
      }
    }, 500);

    return () => {
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
  }, [searchQuery, cityResults.length]);

  // Handle city selection - find nearest station and navigate
  const handleSelectCity = useCallback((city: CityResult, index: number) => {
    Keyboard.dismiss();

    // Find nearest station first to get stationId for analytics
    const isHighAltitude = city.isHighAltitude === true;
    const excludeHighAltitude = !isHighAltitude;
    const forceHighAltitude = isHighAltitude;
    const nearest = findNearestStation(city.coords.lat, city.coords.lon, excludeHighAltitude, forceHighAltitude);

    // Track analytics before clearing state
    if (nearest) {
      trackAutocomplete({
        query: searchQuery,
        locationName: city.name,
        island: city.island,
        stationId: nearest.stationId,
        resultCount: cityResults.length,
        resultPosition: index + 1,
      });
    }

    setSearchQuery('');
    setCityResults([]);
    setGeocodeResults([]);
    setSearchMode('idle');

    if (nearest) {
      navigation.navigate('Result', {
        stationId: nearest.stationId,
        locationName: city.name,
        locationCoords: city.coords,
        isHighAltitudeFallback: nearest.isHighAltitudeFallback,
        // Pass isCoastal from city if explicitly defined (for inland cities)
        isCoastal: city.isCoastal,
        // Pass isHighAltitude from city (for mountain peaks like Pico de las Nieves)
        isHighAltitude: city.isHighAltitude,
      });
    }
  }, [navigation, searchQuery, cityResults.length, trackAutocomplete]);

  // Handle selection from geocode results
  const handleSelectGeocodeResult = useCallback((station: NearbyStation) => {
    Keyboard.dismiss();

    // Track analytics
    trackGeocode({
      query: geocodeQuery,
      locationName: geocodeQuery,
      island: station.island,
      stationId: station.stationId,
    });

    setSearchQuery('');
    setCityResults([]);
    setGeocodeResults([]);
    setSearchMode('idle');

    navigation.navigate('Result', {
      stationId: station.stationId,
      locationName: geocodeQuery,
      locationCoords: geocodeCoords || undefined,
    });
  }, [navigation, geocodeQuery, geocodeCoords, trackGeocode]);

  // Handle quick place selection from popular destinations
  // Now accepts coords directly from islandsData for accurate weather fetching
  const handleSelectPlace = useCallback((
    stationId: string,
    placeName: string,
    islandName: string,
    coords: { lat: number; lon: number }
  ) => {
    Keyboard.dismiss();

    // Track analytics
    trackPopular({
      locationName: placeName,
      island: islandName,
      stationId,
    });

    setSearchQuery('');
    setCityResults([]);
    setGeocodeResults([]);
    setSearchMode('idle');

    navigation.navigate('Result', {
      stationId,
      locationName: placeName,
      locationCoords: coords,
    });
  }, [navigation, trackPopular]);

  const handleGetLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('search.locationPermissionTitle'), t('search.locationPermissionMessage'));
        return;
      }

      const result = await getCurrentLocationWithFallback();
      if (result.type === 'services_disabled') {
        Alert.alert(t('common.error'), t('search.locationServicesDisabled'));
        return;
      }
      if (result.type === 'unavailable') {
        Alert.alert(t('common.error'), t('search.locationUnavailable'));
        return;
      }

      const nearest = findNearestStation(result.lat, result.lon);
      if (nearest) {
        if (nearest.distance > MAX_CANARY_DISTANCE_KM) {
          Alert.alert(
            t('locationPrompt.tooFarTitle'),
            t('locationPrompt.tooFarMessage'),
            [{ text: t('locationPrompt.tooFarButton'), style: 'default' }]
          );
          return;
        }
        Alert.alert(
          t('search.nearestStationTitle'),
          `${t('search.yourLocation')}\n${nearest.distance} ${t('common.km')} ${t('search.fromNearestStation')}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.select'),
              onPress: () => {
                trackGps({
                  stationId: nearest.stationId,
                  island: nearest.station.island,
                  locationName: t('search.myLocationLabel'),
                });
                navigation.navigate('Result', {
                  stationId: nearest.stationId,
                  locationName: t('search.myLocationLabel'),
                  locationCoords: { lat: result.lat, lon: result.lon },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[handleGetLocation] unexpected error:', error);
      Alert.alert(t('common.error'), t('search.locationError'));
    } finally {
      setIsLoadingLocation(false);
    }
  }, [navigation, t, trackGps]);

  const handleLocationPromptUse = useCallback(async () => {
    setIsLocationPromptLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('search.locationPermissionTitle'), t('search.locationPermissionMessage'));
        return;
      }

      const result = await getCurrentLocationWithFallback();

      await AsyncStorage.setItem(LOCATION_PROMPT_KEY, 'true');
      setShowLocationPrompt(false);

      if (result.type === 'services_disabled') {
        Alert.alert(t('common.error'), t('search.locationServicesDisabled'));
        return;
      }
      if (result.type === 'unavailable') {
        Alert.alert(t('common.error'), t('search.locationUnavailable'));
        return;
      }

      const nearest = findNearestStation(result.lat, result.lon);
      if (nearest) {
        if (nearest.distance > MAX_CANARY_DISTANCE_KM) {
          Alert.alert(
            t('locationPrompt.tooFarTitle'),
            t('locationPrompt.tooFarMessage'),
            [{ text: t('locationPrompt.tooFarButton'), style: 'default' }]
          );
          return;
        }

        trackGps({
          stationId: nearest.stationId,
          island: nearest.station.island,
          locationName: t('search.myLocationLabel'),
        });

        navigation.navigate('Result', {
          stationId: nearest.stationId,
          locationName: t('search.myLocationLabel'),
          locationCoords: { lat: result.lat, lon: result.lon },
        });
      }
    } catch (error) {
      console.error('[handleLocationPromptUse] unexpected error:', error);
      Alert.alert(t('common.error'), t('search.locationError'));
    } finally {
      setIsLocationPromptLoading(false);
    }
  }, [navigation, t, trackGps]);

  const handleLocationPromptDismiss = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCATION_PROMPT_KEY, 'true');
    } catch (error) {
      console.warn('Failed to save location prompt dismissal:', error);
    }
    setShowLocationPrompt(false);
  }, []);

  // Islands with their top 3 popular destinations
  // Popular destinations with coordinates for accurate weather fetching
  // Coordinates ensure WeatherAPI returns weather for the actual location, not the distant station
  const canaryIslands = useMemo<IslandTile[]>(() => [
    {
      key: 'tenerife',
      icon: 'volcano' as const,
      places: [
        { name: 'Costa Adeje', stationId: 'C419X', coords: { lat: 28.0783, lon: -16.7260 } },
        { name: 'Los Cristianos', stationId: 'C419X', coords: { lat: 28.0519, lon: -16.7150 } },
        { name: 'Playa de las Américas', stationId: 'C419X', coords: { lat: 28.0560, lon: -16.7330 } },
        { name: 'Puerto de la Cruz', stationId: 'C459Z', coords: { lat: 28.4167, lon: -16.5489 } },
        { name: 'Santa Cruz de Tenerife', stationId: 'C449C', coords: { lat: 28.4636, lon: -16.2518 } },
        { name: 'Los Gigantes', stationId: 'C419X', coords: { lat: 28.2469, lon: -16.8411 } },
      ],
    },
    {
      key: 'granCanaria',
      icon: 'beach' as const,
      places: [
        { name: 'Maspalomas', stationId: 'C689E', coords: { lat: 27.7600, lon: -15.5867 } },
        { name: 'Playa del Inglés', stationId: 'C689E', coords: { lat: 27.7569, lon: -15.5689 } },
        { name: 'Las Palmas', stationId: 'C649I', coords: { lat: 28.1235, lon: -15.4363 } },
        { name: 'Puerto Rico', stationId: 'C629X', coords: { lat: 27.7892, lon: -15.7097 } },
        { name: 'Mogán', stationId: 'C629X', coords: { lat: 27.82, lon: -15.76 } },
        { name: 'Puerto de las Nieves', stationId: 'C658L', coords: { lat: 28.1000, lon: -15.7083 } },
      ],
    },
    {
      key: 'fuerteventura',
      icon: 'surfing' as const,
      places: [
        { name: 'Corralejo', stationId: 'C249I', coords: { lat: 28.7300, lon: -13.8678 } },
        { name: 'Costa Calma', stationId: 'C249I', coords: { lat: 28.1586, lon: -14.2278 } },
        { name: 'Morro Jable', stationId: 'C249I', coords: { lat: 28.0514, lon: -14.3514 } },
        { name: 'Caleta de Fuste', stationId: 'C249I', coords: { lat: 28.3983, lon: -13.8633 } },
        { name: 'El Cotillo', stationId: 'C249I', coords: { lat: 28.6861, lon: -14.0089 } },
        { name: 'Betancuria', stationId: 'C249I', coords: { lat: 28.4258, lon: -14.0569 } },
      ],
    },
    {
      key: 'lanzarote',
      icon: 'terrain' as const,
      places: [
        { name: 'Puerto del Carmen', stationId: 'C029O', coords: { lat: 28.9217, lon: -13.6656 } },
        { name: 'Playa Blanca', stationId: 'C029O', coords: { lat: 28.8600, lon: -13.8300 } },
        { name: 'Costa Teguise', stationId: 'C029O', coords: { lat: 28.9983, lon: -13.5028 } },
        { name: 'Arrecife', stationId: 'C029O', coords: { lat: 28.9630, lon: -13.5477 } },
        { name: 'Yaiza', stationId: 'C029O', coords: { lat: 28.9531, lon: -13.7650 } },
        { name: 'Orzola', stationId: 'C038N', coords: { lat: 29.2167, lon: -13.4500 } },
      ],
    },
    {
      key: 'laPalma',
      icon: 'pine-tree' as const,
      places: [
        { name: 'Los Cancajos', stationId: 'C139E', coords: { lat: 28.6172, lon: -17.7725 } },
        { name: 'Puerto de Naos', stationId: 'C139E', coords: { lat: 28.5981, lon: -17.9067 } },
        { name: 'Santa Cruz de La Palma', stationId: 'C139E', coords: { lat: 28.6825, lon: -17.7644 } },
        { name: 'El Paso', stationId: 'C139E', coords: { lat: 28.6500, lon: -17.8833 } },
        { name: 'Fuencaliente', stationId: 'C139E', coords: { lat: 28.4833, lon: -17.8500 } },
        { name: 'Garafia', stationId: 'C101A', coords: { lat: 28.7833, lon: -17.9167 } },
      ],
    },
    {
      key: 'laGomera',
      icon: 'forest' as const,
      places: [
        { name: 'Valle Gran Rey', stationId: 'C329B', coords: { lat: 28.0922, lon: -17.3342 } },
        { name: 'Playa de Santiago', stationId: 'C329B', coords: { lat: 28.0267, lon: -17.1944 } },
        { name: 'San Sebastián', stationId: 'C329B', coords: { lat: 28.0911, lon: -17.1103 } },
        { name: 'Hermigua', stationId: 'C329B', coords: { lat: 28.1681, lon: -17.1917 } },
        { name: 'Agulo', stationId: 'C329B', coords: { lat: 28.1833, lon: -17.1833 } },
        { name: 'Alojera', stationId: 'C329B', coords: { lat: 28.1333, lon: -17.3167 } },
      ],
    },
    {
      key: 'elHierro',
      icon: 'waves' as const,
      places: [
        { name: 'La Restinga', stationId: 'C929I', coords: { lat: 27.6458, lon: -17.9875 } },
        { name: 'La Frontera', stationId: 'C929I', coords: { lat: 27.7561, lon: -18.0039 } },
        { name: 'Villa de Valverde', stationId: 'C929I', coords: { lat: 27.8092, lon: -17.9153 } },
        { name: 'El Pinar', stationId: 'C929I', coords: { lat: 27.7000, lon: -17.9833 } },
        { name: 'Sabinosa', stationId: 'C929I', coords: { lat: 27.7500, lon: -18.1000 } },
        { name: 'La Caleta', stationId: 'C929I', coords: { lat: 27.7800, lon: -18.0200 } },
      ],
    },
  ], []);

  const balearicIslands = useMemo<IslandTile[]>(() => [
    {
      key: 'mallorca',
      icon: 'palm-tree' as const,
      places: [
        { name: 'Palma', stationId: 'B278', coords: { lat: 39.5696, lon: 2.6502 } },
        { name: 'Alcúdia', stationId: 'B278', coords: { lat: 39.8531, lon: 3.1211 } },
        { name: "Cala d'Or", stationId: 'B278', coords: { lat: 39.3781, lon: 3.2331 } },
        { name: 'Magaluf', stationId: 'B278', coords: { lat: 39.5089, lon: 2.5306 } },
        { name: 'Sóller', stationId: 'B278', coords: { lat: 39.7669, lon: 2.7156 } },
        { name: 'Port de Pollença', stationId: 'B278', coords: { lat: 39.9081, lon: 3.0808 } },
      ],
    },
    {
      key: 'menorca',
      icon: 'sail-boat' as const,
      places: [
        { name: 'Maó', stationId: 'B893', coords: { lat: 39.8885, lon: 4.2658 } },
        { name: 'Ciutadella', stationId: 'B893', coords: { lat: 40.0022, lon: 3.8397 } },
        { name: 'Cala en Porter', stationId: 'B893', coords: { lat: 39.8722, lon: 4.1289 } },
        { name: 'Fornells', stationId: 'B893', coords: { lat: 40.0539, lon: 4.1319 } },
        { name: 'Es Mercadal', stationId: 'B893', coords: { lat: 39.9906, lon: 4.0864 } },
        { name: 'Sant Lluís', stationId: 'B893', coords: { lat: 39.8433, lon: 4.2653 } },
      ],
    },
    {
      key: 'ibiza',
      icon: 'beach' as const,
      places: [
        { name: 'Eivissa', stationId: 'B954', coords: { lat: 38.9089, lon: 1.4328 } },
        { name: 'Sant Antoni', stationId: 'B954', coords: { lat: 38.9803, lon: 1.3036 } },
        { name: 'Santa Eulària', stationId: 'B954', coords: { lat: 38.9847, lon: 1.5347 } },
        { name: "Playa d'en Bossa", stationId: 'B954', coords: { lat: 38.8814, lon: 1.4083 } },
        { name: 'Portinatx', stationId: 'B954', coords: { lat: 39.1114, lon: 1.5178 } },
        { name: 'Cala Llonga', stationId: 'B954', coords: { lat: 38.9553, lon: 1.5292 } },
      ],
    },
    {
      key: 'formentera',
      icon: 'waves' as const,
      places: [
        { name: 'Es Pujols', stationId: 'B954', coords: { lat: 38.7267, lon: 1.4600 } },
        { name: 'La Savina', stationId: 'B954', coords: { lat: 38.7328, lon: 1.4172 } },
        { name: 'Sant Francesc', stationId: 'B954', coords: { lat: 38.7047, lon: 1.4306 } },
        { name: 'Es Caló', stationId: 'B954', coords: { lat: 38.7139, lon: 1.5006 } },
        { name: 'Ses Illetes', stationId: 'B954', coords: { lat: 38.7461, lon: 1.4356 } },
        { name: 'Cala Saona', stationId: 'B954', coords: { lat: 38.6906, lon: 1.4022 } },
      ],
    },
  ], []);

  const mainlandAreas = useMemo<IslandTile[]>(() => [
    {
      key: 'costaDelSol',
      icon: 'weather-sunny' as const,
      places: [
        { name: 'Málaga', stationId: '6155A', coords: { lat: 36.7213, lon: -4.4214 } },
        { name: 'Marbella', stationId: '6155A', coords: { lat: 36.5101, lon: -4.8863 } },
        { name: 'Torremolinos', stationId: '6155A', coords: { lat: 36.6242, lon: -4.4998 } },
        { name: 'Fuengirola', stationId: '6155A', coords: { lat: 36.5397, lon: -4.6244 } },
        { name: 'Nerja', stationId: '6155A', coords: { lat: 36.7461, lon: -3.8742 } },
        { name: 'Estepona', stationId: '6155A', coords: { lat: 36.4272, lon: -5.1450 } },
      ],
    },
    {
      key: 'costaAlmeria',
      icon: 'beach' as const,
      places: [
        { name: 'Almería', stationId: '6325O', coords: { lat: 36.8340, lon: -2.4637 } },
        { name: 'Roquetas de Mar', stationId: '6325O', coords: { lat: 36.7642, lon: -2.6147 } },
        { name: 'Mojácar', stationId: '6325O', coords: { lat: 37.1394, lon: -1.8514 } },
        { name: 'Aguadulce', stationId: '6325O', coords: { lat: 36.8083, lon: -2.5533 } },
        { name: 'Cabo de Gata', stationId: '6325O', coords: { lat: 36.7219, lon: -2.1931 } },
        { name: 'Adra', stationId: '6325O', coords: { lat: 36.7497, lon: -3.0206 } },
      ],
    },
    {
      key: 'costaCalida',
      icon: 'waves' as const,
      places: [
        { name: 'Cartagena', stationId: '7031X', coords: { lat: 37.6257, lon: -0.9966 } },
        { name: 'La Manga', stationId: '7031X', coords: { lat: 37.6394, lon: -0.7256 } },
        { name: 'Mazarrón', stationId: '7031X', coords: { lat: 37.5992, lon: -1.2589 } },
        { name: 'Águilas', stationId: '7031X', coords: { lat: 37.4064, lon: -1.5836 } },
        { name: 'San Pedro del Pinatar', stationId: '7031X', coords: { lat: 37.8153, lon: -0.7897 } },
        { name: 'Los Alcázares', stationId: '7031X', coords: { lat: 37.7411, lon: -0.8503 } },
      ],
    },
    {
      key: 'costaBlanca',
      icon: 'umbrella-beach' as const,
      places: [
        { name: 'Alicante', stationId: '8025', coords: { lat: 38.3452, lon: -0.4810 } },
        { name: 'Benidorm', stationId: '8025', coords: { lat: 38.5411, lon: -0.1225 } },
        { name: 'Torrevieja', stationId: '8025', coords: { lat: 37.9783, lon: -0.6822 } },
        { name: 'Calpe', stationId: '8025', coords: { lat: 38.6447, lon: 0.0447 } },
        { name: 'Dénia', stationId: '8025', coords: { lat: 38.8408, lon: 0.1057 } },
        { name: 'Jávea', stationId: '8025', coords: { lat: 38.7892, lon: 0.1661 } },
      ],
    },
    {
      key: 'costaValencia',
      icon: 'city' as const,
      places: [
        { name: 'Valencia', stationId: '8416', coords: { lat: 39.4699, lon: -0.3763 } },
        { name: 'Gandía', stationId: '8416', coords: { lat: 38.9683, lon: -0.1817 } },
        { name: 'Cullera', stationId: '8416', coords: { lat: 39.1622, lon: -0.2519 } },
        { name: 'Sagunto', stationId: '8416', coords: { lat: 39.6803, lon: -0.2742 } },
        { name: 'Oliva', stationId: '8416', coords: { lat: 38.9214, lon: -0.1156 } },
        { name: 'El Saler', stationId: '8416', coords: { lat: 39.3856, lon: -0.3247 } },
      ],
    },
  ], []);

  const regionsData = useMemo(() => [
    { key: 'canary', islands: canaryIslands },
    { key: 'balearic', islands: balearicIslands },
    { key: 'mainland', islands: mainlandAreas },
  ], [canaryIslands, balearicIslands, mainlandAreas]);

  // Flat lookup across all regions (for the "popular places" drawer)
  const allIslands = useMemo(
    () => regionsData.flatMap((r) => r.islands),
    [regionsData]
  );

  // Popular destinations as a flat list (redesign — Sunly)
  const popularPlaces = useMemo(() => {
    const picks = [
      { name: 'Costa Adeje', islandKey: 'tenerife', coords: { lat: 28.0783, lon: -16.7260 } },
      { name: 'Playa del Inglés', islandKey: 'granCanaria', coords: { lat: 27.7569, lon: -15.5689 } },
      { name: 'Corralejo', islandKey: 'fuerteventura', coords: { lat: 28.7300, lon: -13.8678 } },
      { name: 'Puerto del Carmen', islandKey: 'lanzarote', coords: { lat: 28.9217, lon: -13.6656 } },
      { name: 'Los Cristianos', islandKey: 'tenerife', coords: { lat: 28.0519, lon: -16.7150 } },
      { name: 'Puerto de la Cruz', islandKey: 'tenerife', coords: { lat: 28.4167, lon: -16.5489 } },
    ];
    return picks.map((p) => {
      const nearest = findNearestStation(p.coords.lat, p.coords.lon);
      return {
        ...p,
        stationId: nearest?.stationId ?? '',
        distance: nearest?.distance,
      };
    });
  }, []);

  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);

  const handleSelectIsland = useCallback((islandKey: string) => {
    if (selectedIsland === islandKey) {
      setSelectedIsland(null);
      return;
    }

    // Track island expansion
    trackIsland(t(`islands.${islandKey}`));

    setSelectedIsland(islandKey);
    shouldScrollToPlaces.current = true;
  }, [selectedIsland, trackIsland, t]);

  const handlePlacesLayout = useCallback(() => {
    if (shouldScrollToPlaces.current && placesRef.current && scrollContentRef.current) {
      shouldScrollToPlaces.current = false;

      // Use measureLayout to get position relative to ScrollView content
      (placesRef.current as any).measureLayout(
        scrollContentRef.current,
        (_x: number, y: number) => {
          // Scroll so the places card starts near the top with small padding
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 16),
            animated: true,
          });
        },
        () => {
          // Fallback: scroll to end if measureLayout fails
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      );
    }
  }, []);

  const hasAnyResults = cityResults.length > 0 || geocodeResults.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Background gradient (light) */}
      <LinearGradient
        colors={[...light.gradient]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View ref={scrollContentRef} collapsable={false}>
              {/* Top app bar: brand + language switcher */}
              <View style={styles.appBar}>
                <View style={styles.appBarBrand}>
                  <SunlyIcon size={32} simple />
                  <Text style={styles.brandName}>Sunly</Text>
                </View>
                <LanguageSwitcher delay={50} />
              </View>

              {/* FIGMA: STYLE_TARGET — Search section (input, GPS button) */}
              <View style={styles.searchSection}>
                {/* FIGMA: STYLE_TARGET — Search input container with glassmorphism */}
                <View style={styles.searchContainer}>
                  <BlurView
                    intensity={glassTokens.blurIntensity}
                    tint="light"
                    style={[StyleSheet.absoluteFill, styles.searchBlur]}
                  />
                  <View style={styles.searchOverlay} />
                  <View style={styles.searchInputRow}>
                    {isGeocodingLoading ? (
                      <ActivityIndicator size="small" color={light.colors.textMuted} />
                    ) : (
                      <Ionicons name="search" size={20} color={light.colors.textMuted} />
                    )}
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('search.placeholder')}
                      placeholderTextColor={light.colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => { setSearchQuery(''); setCityResults([]); setGeocodeResults([]); setSearchMode('idle'); }}>
                        <Ionicons name="close-circle" size={20} color={light.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* City autocomplete results */}
                {searchMode === 'cities' && cityResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    {cityResults.map((city, index) => (
                      <TouchableOpacity
                        key={`${city.name}-${index}`}
                        style={styles.resultItem}
                        onPress={() => handleSelectCity(city, index)}
                      >
                        <View style={styles.resultItemContent}>
                          <Ionicons name="location" size={20} color={light.colors.primary} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{city.name}</Text>
                            <Text style={styles.resultItemDetail}>{city.island}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={light.colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Geocode results - show when city not found in database */}
                {searchMode === 'geocode' && geocodeResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <View style={styles.geocodeHeader}>
                      <Ionicons name="compass" size={16} color={light.colors.primary} />
                      <Text style={styles.geocodeHeaderText}>
                        {t('search.weatherNearby')} „{geocodeQuery}"
                      </Text>
                    </View>
                    {geocodeResults.slice(0, 1).map((item) => (
                      <TouchableOpacity
                        key={item.stationId}
                        style={styles.resultItem}
                        onPress={() => handleSelectGeocodeResult(item)}
                      >
                        <View style={styles.resultItemContent}>
                          <Ionicons name="navigate-circle" size={22} color={light.colors.primary} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{geocodeQuery}</Text>
                            <Text style={styles.resultItemDetail}>
                              {item.island} • {t('search.weatherFromArea')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={light.colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No results message */}
                {searchMode === 'no_results' && !isGeocodingLoading && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={32} color={light.colors.textMuted} />
                    <Text style={styles.noResultsText}>
                      {t('search.noResults')}
                    </Text>
                    <Text style={styles.noResultsHint}>
                      {t('search.noResultsHint')}
                    </Text>
                  </View>
                )}

                {/* FIGMA: STYLE_TARGET — GPS location button with glassmorphism */}
                <TouchableOpacity style={styles.gpsButton} onPress={handleGetLocation} disabled={isLoadingLocation}>
                  <BlurView
                    intensity={glassTokens.blurIntensity}
                    tint="light"
                    style={[StyleSheet.absoluteFill, styles.gpsBlur]}
                  />
                  <View style={styles.gpsOverlay} />
                  <View style={styles.gpsButtonContent}>
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                    <Text style={[styles.gpsButtonText, isLoadingLocation && styles.gpsButtonTextDisabled]}>
                      {isLoadingLocation ? t('search.searching') : t('search.myLocation')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* FIGMA: STYLE_TARGET — Popular destinations grid */}
              {!hasAnyResults && searchMode !== 'no_results' && searchQuery.length === 0 && (
                <View style={styles.popularSection}>
                  <Text style={styles.popularTitle}>{t('search.popularDestinations')}</Text>
                  {USE_PLACE_LIST ? (
                    <View style={styles.placesList}>
                      {popularPlaces.map((place, index) => (
                        <TouchableOpacity
                          key={place.name}
                          activeOpacity={0.85}
                          onPress={() => handleSelectPlace(place.stationId, place.name, t(`islands.${place.islandKey}`), place.coords)}
                        >
                          <GlassCard scheme="light" style={styles.placeCard} delay={100 + index * 50}>
                            <View style={styles.placeCardInner}>
                              <View style={styles.placeIconCircle}>
                                <Ionicons name="location" size={20} color={light.colors.primary} />
                              </View>
                              <View style={styles.placeCardCenter}>
                                <Text style={styles.placeCardName}>{place.name}</Text>
                                <Text style={styles.placeCardIsland}>{t(`islands.${place.islandKey}`)}</Text>
                              </View>
                              {place.distance != null && (
                                <View style={styles.placeCardRight}>
                                  <Text style={styles.placeCardDistance}>{place.distance} {t('common.km')}</Text>
                                  <Text style={styles.placeCardDistanceLabel} numberOfLines={1}>{t('search.fromNearestStation')}</Text>
                                </View>
                              )}
                            </View>
                          </GlassCard>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                  <>
                  {regionsData.map((region) => (
                    <View key={region.key} style={styles.regionSection}>
                      <Text style={styles.regionTitle}>{t(`regions.${region.key}`)}</Text>
                      <View style={styles.islandsGrid}>
                        {region.islands.map((island, index) => (
                          <TouchableOpacity
                            key={island.key}
                            activeOpacity={0.8}
                            onPress={() => handleSelectIsland(island.key)}
                          >
                            <GlassCard
                              scheme="light"
                              style={[
                                styles.islandItem,
                                selectedIsland === island.key && styles.islandItemActive,
                              ]}
                              delay={100 + index * 50}
                            >
                              <View style={styles.islandItemInner}>
                                <View style={[styles.islandIconCircle, selectedIsland === island.key && styles.islandIconCircleActive]}>
                                  <MaterialCommunityIcons name={island.icon} size={26} color={selectedIsland === island.key ? '#FFFFFF' : light.colors.primary} />
                                </View>
                                <Text style={[styles.islandItemName, selectedIsland === island.key && styles.islandItemNameActive]} numberOfLines={1}>{t(`islands.${island.key}`)}</Text>
                                <Text style={styles.islandItemSub} numberOfLines={1}>{island.places.length} {t('search.popularPlaces')}</Text>
                              </View>
                            </GlassCard>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}

                  {selectedIsland && (
                    <View
                      ref={placesRef}
                      onLayout={handlePlacesLayout}
                    >
                    <GlassCard scheme="light" style={styles.placesContainer} delay={100}>
                      <View style={styles.placesContainerInner}>
                        <View style={styles.placesHeader}>
                          <Text style={styles.placesTitle}>{t(`islands.${selectedIsland}`)} - {t('search.popularPlaces')}</Text>
                          <TouchableOpacity
                            style={styles.placesCloseBtn}
                            onPress={() => setSelectedIsland(null)}
                          >
                            <Ionicons name="close" size={20} color={light.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.placesGrid}>
                          {allIslands.find(i => i.key === selectedIsland)?.places.map((place, index) => (
                            <TouchableOpacity
                              key={place.name}
                              activeOpacity={0.8}
                              onPress={() => handleSelectPlace(place.stationId, place.name, t(`islands.${selectedIsland}`), place.coords)}
                            >
                              <GlassCard scheme="light" style={styles.placeItem} variant="subtle" delay={200 + index * 100}>
                                <View style={styles.placeItemInner}>
                                  <View style={styles.placeItemIconCircle}>
                                    <Ionicons name="location" size={18} color={light.colors.primary} />
                                  </View>
                                  <Text style={styles.placeItemName} numberOfLines={2}>{place.name}</Text>
                                </View>
                              </GlassCard>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </GlassCard>
                    </View>
                  )}
                  </>
                  )}
                </View>
              )}

              {/* Footer with data source and disclaimer */}
              <View style={styles.footerSection}>
                <Text style={styles.footerStats}>{t('search.footer')}</Text>
                <View style={styles.footerDivider} />
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://www.aemet.es/')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerSource}>
                    {t('footer.dataSource')} (aemet.es)
                  </Text>
                </TouchableOpacity>
                <Text style={styles.footerDisclaimer}>
                  {t('footer.disclaimer')}
                </Text>
              </View>

              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Location Permission Prompt Modal */}
      <LocationPrompt
        visible={showLocationPrompt}
        onUseLocation={handleLocationPromptUse}
        onDismiss={handleLocationPromptDismiss}
        isLoading={isLocationPromptLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: light.colors.background },
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  content: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  // Top app bar: brand left, language right
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  appBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: light.colors.textPrimary,
  },
  // Search section
  searchSection: { marginBottom: spacing.lg },
  // Search input — frosted capsule on light background
  searchContainer: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: light.colors.border,
    overflow: 'hidden',
    ...light.cardShadow,
  },
  searchBlur: {
    borderRadius: 30,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: light.colors.surfaceStrong,
    borderRadius: 30,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: light.colors.textPrimary,
    marginLeft: spacing.sm + 2,
  },
  // GPS button — solid primary
  gpsButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
    ...light.cardShadow,
    shadowOpacity: 0.25,
  },
  gpsBlur: {
    borderRadius: borderRadius.lg,
  },
  gpsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: light.colors.primary,
    borderRadius: borderRadius.lg,
  },
  gpsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  gpsButtonTextDisabled: { color: 'rgba(255,255,255,0.7)' },
  resultsContainer: { marginTop: spacing.sm + spacing.xs, marginBottom: spacing.xs },
  geocodeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm + 2, paddingHorizontal: spacing.xs },
  geocodeHeaderText: { fontFamily: fonts.medium, fontSize: 14, color: light.colors.textSecondary, marginLeft: 6 },
  // Result item card — light frosted
  resultItem: {
    backgroundColor: light.colors.surfaceStrong,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: light.colors.border,
    marginBottom: spacing.sm,
    padding: spacing.md,
    ...light.cardShadow,
  },
  resultItemContent: { flexDirection: 'row', alignItems: 'center' },
  resultItemCenter: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  resultItemName: { fontFamily: fonts.semibold, fontSize: 16, color: light.colors.textPrimary, marginBottom: 2 },
  resultItemDetail: { fontFamily: fonts.regular, fontSize: 14, color: light.colors.textSecondary },
  noResultsContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xl - spacing.xs,
    backgroundColor: light.colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: light.colors.border,
  },
  noResultsText: { fontFamily: fonts.medium, fontSize: 15, color: light.colors.textSecondary, marginTop: spacing.sm + 2 },
  noResultsHint: { fontFamily: fonts.regular, fontSize: 13, color: light.colors.textMuted, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xl - spacing.xs },
  popularSection: { marginTop: spacing.xs },
  popularTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: light.colors.textPrimary,
    marginBottom: spacing.md,
  },
  // Popular places — flat list of destination cards
  placesList: {},
  placeCard: {
    marginBottom: spacing.sm + spacing.xs,
  },
  placeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  placeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeCardCenter: {
    flex: 1,
    marginLeft: spacing.md,
  },
  placeCardName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: light.colors.textPrimary,
    marginBottom: 2,
  },
  placeCardIsland: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: light.colors.textSecondary,
  },
  placeCardRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
    maxWidth: 92,
  },
  placeCardDistance: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: light.colors.primary,
  },
  placeCardDistanceLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: light.colors.textMuted,
  },
  // Region section (Canary / Balearic / Mainland)
  regionSection: {
    marginBottom: spacing.md,
  },
  regionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: light.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  // Islands grid - squares with GlassCard
  islandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  islandItem: {
    width: (Dimensions.get('window').width - spacing.lg * 2 - spacing.sm) / 2,
    aspectRatio: 1.15,
    marginBottom: spacing.sm,
  },
  islandItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  islandIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  islandIconCircleActive: {
    backgroundColor: light.colors.primary,
  },
  islandItemActive: {
    borderColor: light.colors.primary,
    borderWidth: 2,
    shadowColor: light.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  islandItemName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: light.colors.textPrimary,
    textAlign: 'center',
  },
  islandItemNameActive: {
    color: light.colors.primary,
  },
  islandItemSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: light.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  // Places within island - grid of squares with GlassCard
  placesContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  placesContainerInner: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  placesTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: light.colors.textSecondary,
    textAlign: 'center',
  },
  placesCloseBtn: {
    position: 'absolute',
    right: 0,
    padding: spacing.xs,
  },
  placesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  placeItem: {
    width: ((Dimensions.get('window').width - spacing.lg * 2 - spacing.sm * 4) / 2) * 0.95,
    aspectRatio: 1.15,
    marginBottom: spacing.sm,
  },
  placeItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  placeItemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  placeItemName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: light.colors.textPrimary,
    textAlign: 'center',
  },
  // Footer section with disclaimer
  footerSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  footerStats: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: light.colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footerDivider: {
    width: 60,
    height: 1,
    backgroundColor: light.colors.textMuted,
    opacity: 0.3,
    marginBottom: spacing.md,
  },
  footerSource: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: light.colors.textSecondary,
    textDecorationLine: 'underline',
    marginBottom: spacing.xs,
  },
  footerDisclaimer: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: light.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 16,
  },
});
