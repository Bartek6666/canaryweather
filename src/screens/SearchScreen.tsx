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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { theme, colors, spacing, typography, glass, glassTokens, glassText, borderRadius, gradients, shadows } from '../constants/theme';
import locationsMapping from '../constants/locations_mapping.json';
import { findNearestStations, NearbyStation } from '../services/weatherService';
import { GlassCard, HeroLogo, LanguageSwitcher } from '../components';

// Satellite map background – place your image at assets/map_bg.jpg
const MAP_BG_SOURCE = require('../../assets/map_bg.jpg');

type RootStackParamList = {
  Search: undefined;
  Result: { stationId: string; locationAlias?: string };
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

interface StationResult {
  id: string;
  name: string;
  island: string;
  municipality: string;
  matchedAlias?: string;
  score: number;
}

type SearchMode = 'local' | 'geocode' | 'no_results' | 'idle';

const { width, height } = Dimensions.get('window');

// Time gradient is resolved via theme helper

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;
  return 0;
}

function searchStations(query: string): StationResult[] {
  if (!query || query.length < 2) return [];
  const stations = locationsMapping.stations as Record<string, any>;
  const results: StationResult[] = [];
  for (const [id, station] of Object.entries(stations)) {
    let bestScore = 0;
    let matchedAlias: string | undefined;
    bestScore = Math.max(bestScore, fuzzyMatch(query, station.name));
    const mScore = fuzzyMatch(query, station.municipality);
    if (mScore > bestScore) { bestScore = mScore; matchedAlias = station.municipality; }
    for (const alias of station.aliases) {
      const aScore = fuzzyMatch(query, alias);
      if (aScore > bestScore) { bestScore = aScore; matchedAlias = alias; }
    }
    if (bestScore > 30) {
      results.push({ id, name: station.name, island: station.island, municipality: station.municipality, matchedAlias: matchedAlias !== station.name ? matchedAlias : undefined, score: bestScore });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestStation(lat: number, lon: number) {
  const stations = locationsMapping.stations as Record<string, any>;
  let nearestId: string | null = null;
  let minDistance = Infinity;
  for (const [id, station] of Object.entries(stations)) {
    const d = haversineDistance(lat, lon, station.latitude, station.longitude);
    if (d < minDistance) { minDistance = d; nearestId = id; }
  }
  return nearestId ? { id: nearestId, distance: Math.round(minDistance * 10) / 10 } : null;
}

export default function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StationResult[]>([]);
  const [geocodeResults, setGeocodeResults] = useState<NearbyStation[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('idle');
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Local search (instant, 150ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const localResults = searchStations(searchQuery);
      setSearchResults(localResults);

      if (localResults.length > 0) {
        setSearchMode('local');
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

  // Geocoding fallback (500ms debounce, fires only when no local results)
  useEffect(() => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }

    if (searchQuery.length < 3 || searchResults.length > 0) {
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
  }, [searchQuery, searchResults.length]);

  const handleSelectStation = useCallback((stationId: string, alias?: string) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setGeocodeResults([]);
    setSearchMode('idle');
    navigation.navigate('Result', { stationId, locationAlias: alias || undefined });
  }, [navigation]);

  const handleGetLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('search.locationPermissionTitle'), t('search.locationPermissionMessage')); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = findNearestStation(loc.coords.latitude, loc.coords.longitude);
      if (nearest) {
        const station = (locationsMapping.stations as Record<string, any>)[nearest.id];
        Alert.alert(t('search.nearestStationTitle'), `${station.name} (${station.island})\n${nearest.distance} ${t('common.km')}`, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.select'), onPress: () => handleSelectStation(nearest.id) },
        ]);
      }
    } catch { Alert.alert(t('common.error'), t('search.locationError')); }
    finally { setIsLoadingLocation(false); }
  }, [handleSelectStation, t]);

  // Islands with their top 3 popular destinations
  const islandsData = useMemo(() => [
    {
      key: 'tenerife',
      icon: 'volcano' as const,
      places: [
        { name: 'Costa Adeje', stationId: 'C419X' },
        { name: 'Los Cristianos', stationId: 'C419X' },
        { name: 'Puerto de la Cruz', stationId: 'C459Z' },
      ],
    },
    {
      key: 'granCanaria',
      icon: 'beach' as const,
      places: [
        { name: 'Maspalomas', stationId: 'C689E' },
        { name: 'Playa del Inglés', stationId: 'C689E' },
        { name: 'Puerto Rico', stationId: 'C629X' },
      ],
    },
    {
      key: 'fuerteventura',
      icon: 'surfing' as const,
      places: [
        { name: 'Corralejo', stationId: 'C249I' },
        { name: 'Costa Calma', stationId: 'C249I' },
        { name: 'Jandía', stationId: 'C249I' },
      ],
    },
    {
      key: 'lanzarote',
      icon: 'terrain' as const,
      places: [
        { name: 'Puerto del Carmen', stationId: 'C029O' },
        { name: 'Playa Blanca', stationId: 'C029O' },
        { name: 'Costa Teguise', stationId: 'C029O' },
      ],
    },
    {
      key: 'laPalma',
      icon: 'pine-tree' as const,
      places: [
        { name: 'Los Cancajos', stationId: 'C139E' },
        { name: 'Puerto Naos', stationId: 'C139E' },
        { name: 'Santa Cruz de La Palma', stationId: 'C139E' },
      ],
    },
    {
      key: 'laGomera',
      icon: 'forest' as const,
      places: [
        { name: 'Valle Gran Rey', stationId: 'C329B' },
        { name: 'Playa de Santiago', stationId: 'C329B' },
        { name: 'San Sebastián', stationId: 'C329B' },
      ],
    },
    {
      key: 'elHierro',
      icon: 'waves' as const,
      places: [
        { name: 'La Restinga', stationId: 'C929I' },
        { name: 'Frontera', stationId: 'C929I' },
        { name: 'Valverde', stationId: 'C929I' },
      ],
    },
  ], []);

  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);

  const hasAnyResults = searchResults.length > 0 || geocodeResults.length > 0;

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
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                <Text style={styles.subtitle}>{t('search.subtitle')}</Text>
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
                      <TouchableOpacity onPress={() => { setSearchQuery(''); setGeocodeResults([]); setSearchMode('idle'); }}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Local results */}
                {searchMode === 'local' && searchResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.resultItem}
                        onPress={() => handleSelectStation(item.id)}
                      >
                        <View style={styles.resultItemContent}>
                          <Ionicons name="location" size={20} color={colors.primary} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{item.name}</Text>
                            <Text style={styles.resultItemDetail}>
                              {item.island}{item.matchedAlias && ` \u2022 "${item.matchedAlias}"`}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Geocode results */}
                {searchMode === 'geocode' && geocodeResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <View style={styles.geocodeHeader}>
                      <Ionicons name="compass" size={16} color={colors.primary} />
                      <Text style={styles.geocodeHeaderText}>
                        {t('search.stationsNearby')} „{geocodeQuery}"
                      </Text>
                    </View>
                    {geocodeResults.map((item) => (
                      <TouchableOpacity
                        key={item.stationId}
                        style={styles.resultItem}
                        onPress={() => handleSelectStation(item.stationId, geocodeQuery)}
                      >
                        <View style={styles.resultItemContent}>
                          <Ionicons name="navigate-circle" size={22} color={colors.rain} />
                          <View style={styles.resultItemCenter}>
                            <Text style={styles.resultItemName}>{item.name}</Text>
                            <Text style={styles.resultItemDetail}>
                              {item.island} \u2022 {item.distance} {t('common.km')} {t('search.fromTarget')}
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
                        onPress={() => setSelectedIsland(selectedIsland === island.key ? null : island.key)}
                      >
                        <GlassCard
                          style={[
                            styles.islandItem,
                            selectedIsland === island.key && styles.islandItemActive,
                          ]}
                          delay={100 + index * 50}
                        >
                          <View style={styles.islandItemInner}>
                            <MaterialCommunityIcons name={island.icon} size={28} color={selectedIsland === island.key ? colors.accent : glassText.secondary} />
                            <Text style={[styles.islandItemName, selectedIsland === island.key && styles.islandItemNameActive]} numberOfLines={2}>{t(`islands.${island.key}`)}</Text>
                          </View>
                        </GlassCard>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedIsland && (
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
                              onPress={() => handleSelectStation(place.stationId, place.name)}
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
                  )}
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('search.footer')}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  popularSection: { marginTop: spacing.lg },
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
    borderColor: colors.accent,
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
    color: colors.accent,
  },
  // Places within island - grid of squares with GlassCard
  placesContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  placesContainerInner: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
    width: ((Dimensions.get('window').width - spacing.lg * 2 - spacing.sm * 4) / 2) * 0.9,
    aspectRatio: 1.2,
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
  footer: { alignItems: 'center', marginTop: spacing.xl, paddingBottom: spacing.xl - spacing.xs },
  footerText: { ...typography.bodySmall, color: colors.textMuted },
});
