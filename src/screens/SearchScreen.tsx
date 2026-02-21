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
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { theme, colors, spacing, typography, glass, glassTokens, glassText, borderRadius, gradients, shadows } from '../constants/theme';
import locationsMapping from '../constants/locations_mapping.json';
import { findNearestStations, findNearestStation as findNearestStationService, NearbyStation } from '../services/weatherService';
import { GlassCard, HeroLogo, LanguageSwitcher, LocationPrompt } from '../components';
import { City } from '../types/weather';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';

const LOCATION_PROMPT_KEY = 'location_prompt_dismissed';

// Background image
const MAP_BG_SOURCE = require('../../assets/grafika_wulkan_1.png');

type RootStackParamList = {
  Search: undefined;
  Result: {
    stationId: string;
    locationName?: string;
    locationCoords?: { lat: number; lon: number };
    isHighAltitudeFallback?: boolean;
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
}

type SearchMode = 'cities' | 'geocode' | 'no_results' | 'idle';

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
      } catch (e) {
        console.warn('Failed to check location prompt status:', e);
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
    const nearest = findNearestStationService(city.coords.lat, city.coords.lon, excludeHighAltitude, forceHighAltitude);

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
  const handleSelectPlace = useCallback((stationId: string, placeName: string, islandName: string) => {
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

    // Find the city in our database to get coordinates
    const cities = locationsMapping.cities as City[];
    const city = cities.find(c => c.name === placeName);

    navigation.navigate('Result', {
      stationId,
      locationName: placeName,
      locationCoords: city?.coords,
    });
  }, [navigation, trackPopular]);

  const handleGetLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('search.locationPermissionTitle'), t('search.locationPermissionMessage')); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = findNearestStationService(loc.coords.latitude, loc.coords.longitude);
      if (nearest) {
        Alert.alert(
          t('search.nearestStationTitle'),
          `${t('search.yourLocation')}\n${nearest.distance} ${t('common.km')} ${t('search.fromNearestStation')}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.select'),
              onPress: () => {
                // Track GPS selection
                trackGps({
                  stationId: nearest.stationId,
                  island: nearest.station.island,
                  locationName: t('search.myLocationLabel'),
                });
                navigation.navigate('Result', {
                  stationId: nearest.stationId,
                  locationName: t('search.myLocationLabel'),
                  locationCoords: { lat: loc.coords.latitude, lon: loc.coords.longitude },
                });
              },
            },
          ]
        );
      }
    } catch { Alert.alert(t('common.error'), t('search.locationError')); }
    finally { setIsLoadingLocation(false); }
  }, [navigation, t, trackGps]);

  // Location prompt handlers
  const MAX_DISTANCE_KM = 150; // Max distance to consider user "near" Canary Islands

  const handleLocationPromptUse = useCallback(async () => {
    setIsLocationPromptLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('search.locationPermissionTitle'), t('search.locationPermissionMessage'));
        setIsLocationPromptLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = findNearestStationService(loc.coords.latitude, loc.coords.longitude);

      // Save dismissal to AsyncStorage
      await AsyncStorage.setItem(LOCATION_PROMPT_KEY, 'true');
      setShowLocationPrompt(false);

      if (nearest) {
        // Check if user is too far from Canary Islands
        if (nearest.distance > MAX_DISTANCE_KM) {
          Alert.alert(
            t('locationPrompt.tooFarTitle'),
            t('locationPrompt.tooFarMessage'),
            [{ text: t('locationPrompt.tooFarButton'), style: 'default' }]
          );
          return;
        }

        // Track GPS selection from prompt
        trackGps({
          stationId: nearest.stationId,
          island: nearest.station.island,
          locationName: t('search.myLocationLabel'),
        });

        // Navigate directly to the nearest station with user's location
        navigation.navigate('Result', {
          stationId: nearest.stationId,
          locationName: t('search.myLocationLabel'),
          locationCoords: { lat: loc.coords.latitude, lon: loc.coords.longitude },
        });
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('search.locationError'));
    } finally {
      setIsLocationPromptLoading(false);
    }
  }, [navigation, t, trackGps]);

  const handleLocationPromptDismiss = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCATION_PROMPT_KEY, 'true');
    } catch (e) {
      console.warn('Failed to save location prompt dismissal:', e);
    }
    setShowLocationPrompt(false);
  }, []);

  // Islands with their top 3 popular destinations
  const islandsData = useMemo(() => [
    {
      key: 'tenerife',
      icon: 'volcano' as const,
      places: [
        { name: 'Costa Adeje', stationId: 'C419X' },
        { name: 'Los Cristianos', stationId: 'C419X' },
        { name: 'Playa de las Américas', stationId: 'C419X' },
        { name: 'Puerto de la Cruz', stationId: 'C459Z' },
        { name: 'Santa Cruz de Tenerife', stationId: 'C449C' },
        { name: 'Los Gigantes', stationId: 'C419X' },
      ],
    },
    {
      key: 'granCanaria',
      icon: 'beach' as const,
      places: [
        { name: 'Maspalomas', stationId: 'C689E' },
        { name: 'Playa del Inglés', stationId: 'C689E' },
        { name: 'Las Palmas', stationId: 'C649I' },
        { name: 'Puerto Rico', stationId: 'C629X' },
        { name: 'Mogán', stationId: 'C629X' },
        { name: 'Puerto de las Nieves', stationId: 'C658L' },
      ],
    },
    {
      key: 'fuerteventura',
      icon: 'surfing' as const,
      places: [
        { name: 'Corralejo', stationId: 'C249I' },
        { name: 'Costa Calma', stationId: 'C249I' },
        { name: 'Morro Jable', stationId: 'C249I' },
        { name: 'Caleta de Fuste', stationId: 'C249I' },
        { name: 'El Cotillo', stationId: 'C249I' },
        { name: 'Betancuria', stationId: 'C249I' },
      ],
    },
    {
      key: 'lanzarote',
      icon: 'terrain' as const,
      places: [
        { name: 'Puerto del Carmen', stationId: 'C029O' },
        { name: 'Playa Blanca', stationId: 'C029O' },
        { name: 'Costa Teguise', stationId: 'C029O' },
        { name: 'Arrecife', stationId: 'C029O' },
        { name: 'Yaiza', stationId: 'C029O' },
        { name: 'Orzola', stationId: 'C038N' },
      ],
    },
    {
      key: 'laPalma',
      icon: 'pine-tree' as const,
      places: [
        { name: 'Los Cancajos', stationId: 'C139E' },
        { name: 'Puerto de Naos', stationId: 'C139E' },
        { name: 'Santa Cruz de La Palma', stationId: 'C139E' },
        { name: 'El Paso', stationId: 'C139E' },
        { name: 'Fuencaliente', stationId: 'C139E' },
        { name: 'Garafia', stationId: 'C101A' },
      ],
    },
    {
      key: 'laGomera',
      icon: 'forest' as const,
      places: [
        { name: 'Valle Gran Rey', stationId: 'C329B' },
        { name: 'Playa de Santiago', stationId: 'C329B' },
        { name: 'San Sebastián', stationId: 'C329B' },
        { name: 'Hermigua', stationId: 'C329B' },
        { name: 'Agulo', stationId: 'C329B' },
        { name: 'Alojera', stationId: 'C329B' },
      ],
    },
    {
      key: 'elHierro',
      icon: 'waves' as const,
      places: [
        { name: 'La Restinga', stationId: 'C929I' },
        { name: 'La Frontera', stationId: 'C929I' },
        { name: 'Villa de Valverde', stationId: 'C929I' },
        { name: 'El Pinar', stationId: 'C929I' },
        { name: 'Sabinosa', stationId: 'C929I' },
        { name: 'La Caleta', stationId: 'C929I' },
      ],
    },
  ], []);

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
      {/* Background: satellite map image + time-of-day gradient overlay */}
      <ImageBackground
        source={MAP_BG_SOURCE}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        imageStyle={styles.bgImage}
      >
        <LinearGradient
          colors={[...gradients.main]}
          style={[StyleSheet.absoluteFillObject, styles.bgGradientOverlay]}
        />
      </ImageBackground>
      <View style={styles.overlay} />

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
              {/* FIGMA: STYLE_TARGET — Header (logo, title, subtitle) */}
              <View style={styles.header}>
                {/* Language Switcher - top right */}
                <View style={styles.languageSwitcherRow}>
                  <LanguageSwitcher delay={50} />
                </View>
                <View style={styles.logoContainer}>
                  <HeroLogo size={90} />
                </View>
                <Text style={styles.title}>{t('search.title')}</Text>
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
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Ionicons name="search" size={20} color={colors.textSecondary} />
                    )}
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('search.placeholder')}
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => { setSearchQuery(''); setCityResults([]); setGeocodeResults([]); setSearchMode('idle'); }}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
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
                          <Ionicons name="location" size={20} color={colors.primary} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{city.name}</Text>
                            <Text style={styles.resultItemDetail}>{city.island}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Geocode results - show when city not found in database */}
                {searchMode === 'geocode' && geocodeResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <View style={styles.geocodeHeader}>
                      <Ionicons name="compass" size={16} color={colors.primary} />
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
                          <Ionicons name="navigate-circle" size={22} color={colors.primary} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{geocodeQuery}</Text>
                            <Text style={styles.resultItemDetail}>
                              {item.island} • {t('search.weatherFromArea')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No results message */}
                {searchMode === 'no_results' && !isGeocodingLoading && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={32} color={colors.textDisabled} />
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
                    <Ionicons name="navigate" size={20} color={colors.textPrimary} />
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
                  <View style={styles.islandsGrid}>
                    {islandsData.map((island, index) => (
                      <TouchableOpacity
                        key={island.key}
                        activeOpacity={0.8}
                        onPress={() => handleSelectIsland(island.key)}
                      >
                        <GlassCard
                          style={[
                            styles.islandItem,
                            selectedIsland === island.key && styles.islandItemActive,
                          ]}
                          delay={100 + index * 50}
                        >
                          <View style={styles.islandItemInner}>
                            <MaterialCommunityIcons name={island.icon} size={28} color={selectedIsland === island.key ? '#FFD700' : glassText.secondary} />
                            <Text style={[styles.islandItemName, selectedIsland === island.key && styles.islandItemNameActive]} numberOfLines={2}>{t(`islands.${island.key}`)}</Text>
                          </View>
                        </GlassCard>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedIsland && (
                    <View
                      ref={placesRef}
                      onLayout={handlePlacesLayout}
                    >
                    <GlassCard style={styles.placesContainer} delay={100}>
                      <View style={styles.placesContainerInner}>
                        <View style={styles.placesHeader}>
                          <Text style={styles.placesTitle}>{t(`islands.${selectedIsland}`)} - {t('search.popularPlaces')}</Text>
                          <TouchableOpacity
                            style={styles.placesCloseBtn}
                            onPress={() => setSelectedIsland(null)}
                          >
                            <Ionicons name="close" size={20} color={glassText.secondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.placesGrid}>
                          {islandsData.find(i => i.key === selectedIsland)?.places.map((place, index) => (
                            <TouchableOpacity
                              key={place.name}
                              activeOpacity={0.8}
                              onPress={() => handleSelectPlace(place.stationId, place.name, t(`islands.${selectedIsland}`))}
                            >
                              <GlassCard style={styles.placeItem} variant="subtle" delay={200 + index * 100}>
                                <View style={styles.placeItemInner}>
                                  <Ionicons name="location" size={20} color={colors.primary} />
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
                </View>
              )}

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
  container: { flex: 1, backgroundColor: colors.background },
  bgImage: { opacity: 0.25 },
  bgGradientOverlay: { opacity: 0.85 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayDark },
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  content: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl - spacing.sm, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  languageSwitcherRow: { alignSelf: 'flex-end', marginBottom: spacing.md },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // FIGMA: STYLE_TARGET — Search section
  searchSection: { marginBottom: spacing.lg },
  // FIGMA: STYLE_TARGET — Search input with glassmorphism (capsule shape)
  searchContainer: {
    borderRadius: glassTokens.borderRadius,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    overflow: 'hidden',
    ...shadows.glass,
  },
  searchBlur: {
    borderRadius: glassTokens.borderRadius,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glassTokens.bgSubtle,
    borderRadius: glassTokens.borderRadius,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginLeft: spacing.sm + 2,
  },
  // FIGMA: STYLE_TARGET — GPS button with glassmorphism
  gpsButton: {
    borderRadius: glassTokens.borderRadius,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    overflow: 'hidden',
    marginTop: spacing.md,
    ...shadows.glass,
  },
  gpsBlur: {
    borderRadius: glassTokens.borderRadius,
  },
  gpsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glassTokens.bgSubtle,
    borderRadius: glassTokens.borderRadius,
  },
  gpsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  gpsButtonText: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: typography.h3.fontWeight,
    marginLeft: spacing.sm,
  },
  gpsButtonTextDisabled: { color: colors.textMuted },
  resultsContainer: { marginTop: spacing.sm + spacing.xs, marginBottom: spacing.xs },
  geocodeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm + 2, paddingHorizontal: spacing.xs },
  geocodeHeaderText: { ...typography.bodySmall, color: colors.textSecondary, marginLeft: 6, fontWeight: '500' },
  // FIGMA: STYLE_TARGET — Result item card (bg, border, radius)
  resultItem: { ...glass.card, marginBottom: spacing.sm, padding: spacing.md },
  resultItemContent: { flexDirection: 'row', alignItems: 'center' },
  resultItemCenter: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  resultItemName: { ...typography.h3, marginBottom: 2 },
  resultItemDetail: { ...typography.bodySmall },
  noResultsContainer: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.xl - spacing.xs, ...glass.cardSubtle },
  noResultsText: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm + 2, fontWeight: '500' },
  noResultsHint: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xl - spacing.xs },
  popularSection: { marginTop: spacing.xs },
  popularTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Islands grid - squares with GlassCard
  islandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  islandItem: {
    width: ((Dimensions.get('window').width - spacing.lg * 2 - spacing.sm) / 2) * 0.9,
    aspectRatio: 1.2,
    marginBottom: spacing.sm,
  },
  islandItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  islandItemActive: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  islandItemName: {
    ...typography.bodySmall,
    color: glassText.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.xs,
    flexShrink: 1,
  },
  islandItemNameActive: {
    fontWeight: '600',
    color: '#FFD700',
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
    ...typography.bodySmall,
    color: glassText.secondary,
    fontWeight: '500',
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
  placeItemName: {
    ...typography.bodySmall,
    color: glassText.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
