import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Animated,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, glass, glassText, borderRadius, gradients, shadows, getSunChanceColor, liveCard, theme } from '../constants/theme';
import { AlertCard, GlassCard, SunChanceGauge, SunChanceModal, WeatherIcon, WeatherEffects } from '../components';
import locationsMapping from '../constants/locations_mapping.json';
import { calculateSunChanceWithFallback, SunChanceWithFallback, getMonthlyStats, getBestWeeksForStation, WeeklyBestPeriod, fetchLiveWeather, fetchCalimaStatus, CalimaStatus, LiveWeatherResult } from '../services/weatherService';
import { supabase } from '../services/supabase';
import { SunChanceResult, MonthlyStats, LiveWeatherData, WeatherCondition } from '../types';
import { MONTH_KEYS } from '../i18n';

// Satellite map background – place your image at assets/map_bg.jpg
const MAP_BG_SOURCE = require('../../assets/map_bg.jpg');

/**
 * Formats timestamp to human-readable time (HH:MM)
 */
function formatCacheTime(timestamp: string | undefined): string {
  if (!timestamp) return '--:--';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

type RootStackParamList = {
  Search: undefined;
  Result: {
    stationId: string;
    locationName?: string;
    locationCoords?: { lat: number; lon: number };
    isHighAltitudeFallback?: boolean;
  };
};
type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

interface YearlyData { year: number; sunnyDays: number; totalDays: number; avgTmax: number; avgTmin: number; precipDays: number; }

interface LiveWeatherCardProps {
  data: LiveWeatherData | null;
  isLoading: boolean;
  hasError: boolean;
  isFromCache?: boolean;
}

function LiveWeatherCard({ data, isLoading, hasError, isFromCache = false }: LiveWeatherCardProps) {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulsing LIVE dot animation
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    // Skeleton shimmer animation
    if (isLoading) {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(skeletonAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      );
      shimmer.start();
      return () => shimmer.stop();
    }
  }, [isLoading]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.8, 1.2] });

  // Skeleton loading state
  if (isLoading) {
    return (
      <GlassCard style={styles.liveCard} delay={100}>
        <View style={styles.liveCardInner}>
          {/* Top row: skeleton temp + badge */}
          <View style={styles.liveTopRow}>
            <Animated.View style={[styles.skeleton, styles.skeletonTempLarge, { opacity: skeletonAnim }]} />
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { opacity: 0.3, backgroundColor: colors.liveGreen }]} />
              <Text style={[styles.liveBadgeText, { opacity: 0.5 }]}>{t('result.live')}</Text>
            </View>
          </View>
          {/* Bottom row: skeleton wind + icon */}
          <View style={styles.liveBottomRow}>
            <Animated.View style={[styles.skeleton, styles.skeletonWind, { opacity: skeletonAnim }]} />
            <Animated.View style={[styles.skeleton, styles.skeletonIcon, { opacity: skeletonAnim }]} />
          </View>
        </View>
      </GlassCard>
    );
  }

  // Error state - no live data available
  if (hasError || !data) {
    return (
      <GlassCard style={styles.liveCard} delay={100}>
        <View style={styles.liveCardInner}>
          <View style={styles.liveTopRow}>
            <View style={styles.liveOfflineContent}>
              <Ionicons name="cloud-offline" size={48} color={colors.cloudDark} />
              <Text style={styles.liveOfflineText}>{t('result.noLiveData')}</Text>
              <Text style={styles.liveOfflineHint}>{t('result.checkConnection')}</Text>
            </View>
            <View style={[styles.liveBadge, styles.liveBadgeOffline]}>
              <View style={[styles.liveDot, { backgroundColor: colors.cloudDark }]} />
              <Text style={[styles.liveBadgeText, { color: colors.cloudDark }]}>{t('result.offline')}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <View>
      <GlassCard style={styles.liveCard} delay={100}>
        <View style={styles.liveCardInner}>
          {/* Figma: Top row - Temperature (left) + Live Badge (right) */}
          <View style={styles.liveTopRow}>
            <Text style={styles.liveTempValue}>{data.temperature}°C</Text>
            <View style={isFromCache ? [styles.liveBadge, styles.liveBadgeCache] : styles.liveBadge}>
              {!isFromCache && (
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim, transform: [{ scale: pulseScale }] }]} />
              )}
              {isFromCache && (
                <Ionicons name="cloud-offline-outline" size={14} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
              )}
              <Text style={isFromCache ? [styles.liveBadgeText, styles.liveBadgeTextCache] : styles.liveBadgeText}>
                {isFromCache ? t('result.cached') : t('result.live')}
              </Text>
            </View>
          </View>

          {/* Figma: Bottom row - Wind info (left) + Weather icon with label (right) */}
          <View style={styles.liveBottomRow}>
            {/* Wind info with small glow icon */}
            <View style={styles.liveWindSection}>
              <View style={styles.liveWindRow}>
                <View style={styles.parameterIconWrapper}>
                  <MaterialCommunityIcons
                    name="weather-windy"
                    size={16}
                    color="#FFFFFF"
                    style={styles.parameterIcon}
                  />
                </View>
                <Text style={styles.liveWindText}>{t('result.wind')}: {data.windSpeed} km/h</Text>
              </View>
              {/* Humidity info - last row, no bottom margin */}
              <View style={[styles.liveWindRow, styles.liveWindRowLast]}>
                <View style={styles.parameterIconWrapper}>
                  <Ionicons
                    name="water-outline"
                    size={16}
                    color="#FFFFFF"
                    style={styles.parameterIcon}
                  />
                </View>
                <Text style={styles.liveWindText}>{t('result.humidity')}: {data.humidity}%</Text>
              </View>
            </View>

            {/* Main weather icon with glow + condition label */}
            <View style={styles.liveWeatherSection}>
              <WeatherIcon
                condition={data.condition}
                size={54}
                showGlow={true}
              />
              <Text style={styles.liveConditionLabel}>{t(`weather.${data.conditionLabelKey}`)}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
      {/* Offline cache indicator */}
      {isFromCache && (
        <View style={styles.cacheIndicator}>
          <View style={styles.cacheIndicatorInner}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cacheIndicatorText}>
              {t('result.offlineData', { time: formatCacheTime(data?.timestamp) })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}


function BestTimeCard({ week, rank, delay = 0 }: { week: WeeklyBestPeriod; rank: number; delay?: number }) {
  const { t } = useTranslation();
  const medalColors = [colors.medalGold, colors.medalSilver, colors.medalBronze];
  const borderColors = [
    { borderColor: colors.medalGold, shadowColor: colors.medalGold },
    { borderColor: colors.medalSilver, shadowColor: colors.medalSilver },
    { borderColor: colors.medalBronze, shadowColor: colors.medalBronze },
  ];
  // Map sunChance to weather condition for proper icon rendering
  const weatherCondition: WeatherCondition = week.sunChance >= 70 ? 'sunny' : week.sunChance >= 40 ? 'partly-sunny' : 'cloudy';

  // Format date range using i18n (e.g., "15 jan - 21 jan")
  const startMonthShort = t(`monthsShort.${MONTH_KEYS[week.startMonth]}`).toLowerCase();
  const endMonthShort = t(`monthsShort.${MONTH_KEYS[week.endMonth]}`).toLowerCase();
  const dateRange = `${week.startDay} ${startMonthShort} - ${week.endDay} ${endMonthShort}`;
  const monthName = t(`months.${MONTH_KEYS[week.startMonth]}`);

  return (
    <GlassCard
      style={[
        styles.bestTimeCard,
        {
          borderColor: borderColors[rank].borderColor,
          borderWidth: rank === 0 ? 2 : 1,
          shadowColor: borderColors[rank].shadowColor,
          shadowOpacity: rank === 0 ? 0.4 : 0.2,
          shadowRadius: rank === 0 ? 8 : 4,
        },
      ]}
      delay={delay}
    >
      <View style={styles.bestTimeCardInner}>
        <View style={styles.bestTimeRank}>
          <MaterialCommunityIcons name="medal" size={24} color={medalColors[rank]} />
        </View>
        <View style={styles.bestTimeContent}>
          <Text style={styles.bestTimeDate}>{dateRange}</Text>
          <Text style={styles.bestTimeMonth}>{monthName}</Text>
        </View>
        <View style={styles.bestTimeStats}>
          <View style={styles.bestTimeStat}>
            <WeatherIcon condition={weatherCondition} size={18} showGlow={true} />
            <Text style={[styles.bestTimeValue, { color: getSunChanceColor(week.sunChance) }]}>{week.sunChance}%</Text>
          </View>
          <View style={styles.bestTimeStat}>
            <MaterialCommunityIcons name="thermometer" size={16} color={colors.tempHot} />
            <Text style={styles.bestTimeTemp}>{week.avgTmax}°C</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function YearHistoryItem({ data, month, delay = 0 }: { data: YearlyData; month: number; delay?: number }) {
  const { t } = useTranslation();
  const sunChance = data.totalDays > 0 ? Math.round((data.sunnyDays / data.totalDays) * 100) : 0;
  const weatherCondition: WeatherCondition = sunChance >= 70 ? 'sunny' : sunChance >= 40 ? 'partly-sunny' : 'cloudy';
  const pressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay]);

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: pressAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.yearItem,
          pressed && styles.yearItemPressed,
        ]}
      >
        <View style={styles.yearItemInner}>
          {/* Column 1: Year + Weather Icon */}
          <View style={styles.yearCol1}>
            <Text style={styles.yearItemYear}>{data.year}</Text>
            <WeatherIcon condition={weatherCondition} size={20} showGlow={false} />
          </View>

          {/* Column 2: Sun Chance + Progress Bar */}
          <View style={styles.yearCol2}>
            <View style={styles.sunBarWrapper}>
              <View style={styles.sunBarBackground}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.sunBarFill, { width: `${sunChance}%` }]}
                />
                {/* Glow effect */}
                <View style={[styles.sunBarGlow, { width: `${sunChance}%` }]} />
              </View>
            </View>
            <Text style={[styles.sunBarPercent, { color: getSunChanceColor(sunChance) }]}>{sunChance}%</Text>
          </View>

          {/* Column 3: Temperatures */}
          <View style={styles.yearCol3}>
            <View style={styles.tempRow}>
              <Text style={styles.tempHigh}>{data.avgTmax.toFixed(0)}°</Text>
              <Text style={styles.tempSeparator}>/</Text>
              <Text style={styles.tempLow}>{data.avgTmin.toFixed(0)}°</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ResultScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { stationId, locationName, locationCoords, isHighAltitudeFallback } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [sunChanceResult, setSunChanceResult] = useState<SunChanceResult | null>(null);
  const [sunChanceFallback, setSunChanceFallback] = useState<SunChanceWithFallback['fallbackStation'] | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [bestWeeks, setBestWeeks] = useState<WeeklyBestPeriod[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);

  // Live weather state
  const [liveData, setLiveData] = useState<LiveWeatherData | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Calima alert state (connected to Open-Meteo Air Quality API)
  const [calimaStatus, setCalimaStatus] = useState<CalimaStatus | null>(null);

  // Sun Chance info modal state
  const [showSunChanceModal, setShowSunChanceModal] = useState(false);

  // Handle month selection with scroll to Sun Chance gauge
  const handleMonthSelect = useCallback((month: number) => {
    setSelectedMonth(month);
    // Scroll to top to show Sun Chance gauge (it's the first element)
    setTimeout(() => {
      if (scrollViewRef.current) {
        const scrollView = scrollViewRef.current.getScrollResponder?.() || scrollViewRef.current;
        scrollView.scrollTo?.({ y: 0, animated: true });
      }
    }, 150);
  }, []);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const station = useMemo(() => (locationsMapping.stations as Record<string, any>)[stationId], [stationId]);

  const fetchYearlyData = useCallback(async (month: number) => {
    const currentYear = new Date().getFullYear();
    const years: YearlyData[] = [];
    try {
      for (let year = currentYear; year >= currentYear - 9; year--) {
        const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const end = new Date(year, month, 0).toISOString().split('T')[0];
        const { data, error } = await supabase.from('weather_data').select('tmax, tmin, precip, sol').eq('station_id', stationId).gte('date', start).lte('date', end);
        if (error || !data || data.length === 0) continue;
        const hasSol = data.some(d => d.sol !== null);
        const sunnyDays = hasSol ? data.filter(d => d.sol !== null && d.sol > 6 && (d.precip === null || d.precip === 0)).length : data.filter(d => d.precip === null || d.precip === 0).length;
        const validTmax = data.filter(d => d.tmax !== null);
        const validTmin = data.filter(d => d.tmin !== null);
        years.push({
          year, sunnyDays, totalDays: data.length,
          avgTmax: validTmax.length > 0 ? validTmax.reduce((s, d) => s + (d.tmax || 0), 0) / validTmax.length : 0,
          avgTmin: validTmin.length > 0 ? validTmin.reduce((s, d) => s + (d.tmin || 0), 0) / validTmin.length : 0,
          precipDays: data.filter(d => d.precip !== null && d.precip > 0).length,
        });
      }
    } catch (e) {
      console.warn('[Offline] Network error fetching yearly data');
    }
    return years;
  }, [stationId]);

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  // Fetch live weather data from Open-Meteo
  useEffect(() => {
    if (!station) return;

    const loadLiveWeather = async () => {
      setIsLoadingLive(true);
      setLiveError(false);

      try {
        const result = await fetchLiveWeather(station.latitude, station.longitude, stationId);

        if (result) {
          setLiveData(result.data);
          setIsFromCache(result.isFromCache);
          setLiveError(false);
        } else {
          setLiveData(null);
          setIsFromCache(false);
          setLiveError(true);
        }
      } catch (e) {
        console.error('[LiveWeather] Error fetching data:', e);
        setLiveData(null);
        setIsFromCache(false);
        setLiveError(true);
      } finally {
        setIsLoadingLive(false);
      }
    };

    loadLiveWeather();

    // Refresh live data every 5 minutes
    const interval = setInterval(loadLiveWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [station, stationId]);

  // Fetch Calima status from Open-Meteo Air Quality API
  useEffect(() => {
    if (!station) return;

    const loadCalimaStatus = async () => {
      try {
        const status = await fetchCalimaStatus(station.latitude, station.longitude);
        setCalimaStatus(status);
      } catch (e) {
        console.error('[Calima] Error fetching status:', e);
        setCalimaStatus(null);
      }
    };

    loadCalimaStatus();

    // Refresh calima status every 30 minutes
    const interval = setInterval(loadCalimaStatus, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [station]);

  useEffect(() => {
    (async () => {
      if (!station) return;
      setIsLoading(true);
      setSunChanceFallback(null);
      try {
        const [scWithFallback, stats, yearly, weeks] = await Promise.all([
          calculateSunChanceWithFallback(stationId, station.latitude, station.longitude, selectedMonth),
          getMonthlyStats(stationId),
          fetchYearlyData(selectedMonth),
          getBestWeeksForStation(stationId),
        ]);
        setSunChanceResult(scWithFallback.result);
        setSunChanceFallback(scWithFallback.fallbackStation || null);
        setMonthlyStats(stats); setYearlyData(yearly); setBestWeeks(weeks);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [stationId, station, selectedMonth, fetchYearlyData]);

  const currentStats = useMemo(() => monthlyStats.find(s => s.month === selectedMonth), [monthlyStats, selectedMonth]);

  // Pull-to-refresh handler - force fresh data from API
  const handleRefresh = useCallback(async () => {
    if (!station) return;

    setIsRefreshing(true);

    try {
      // Fetch fresh weather data, bypassing cache
      const result = await fetchLiveWeather(station.latitude, station.longitude, stationId, true);

      if (result) {
        setLiveData(result.data);
        setIsFromCache(result.isFromCache);
        setLiveError(false);
      } else {
        setLiveError(true);
      }

      // Also refresh Calima status
      const calimaResult = await fetchCalimaStatus(station.latitude, station.longitude);
      setCalimaStatus(calimaResult);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [station, stationId]);

  const getSummary = () => {
    const sunChance = sunChanceResult?.sun_chance ?? 0;
    const windSpeed = liveData?.windSpeed ?? 0;
    const avgTemp = currentStats?.avg_tmax ?? 0;
    const displayName = locationName || station?.name;

    const parts: string[] = [];

    // Sun condition
    if (sunChance >= 80) {
      parts.push(t('result.summaryExcellent', { name: displayName }));
    } else if (sunChance >= 60) {
      parts.push(t('result.summarySunny'));
    } else if (sunChance >= 40) {
      parts.push(t('result.summaryModerate'));
    } else {
      parts.push(t('result.summaryCloudy'));
    }

    // Temperature condition
    if (avgTemp >= 28) {
      parts.push(t('result.summaryHot'));
    } else if (avgTemp >= 18 && avgTemp < 28) {
      parts.push(t('result.summaryMild'));
    }

    // Wind condition
    if (windSpeed > 20) {
      parts.push(t('result.summaryWindy'));
    }

    return parts.join(' ');
  };

  if (!station) return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradients.mixed]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('result.stationNotFound')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.errorButton}>{t('common.back')}</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background: satellite map image + gradient overlay */}
      <ImageBackground
        source={MAP_BG_SOURCE}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        imageStyle={styles.bgImage}
      >
        <LinearGradient colors={[...gradients.main]} style={[StyleSheet.absoluteFillObject, styles.bgGradientOverlay]} />
      </ImageBackground>
      <View style={styles.overlay} />

      {/* Ambient Weather Background - subtle animated effects based on current weather */}
      {liveData && <WeatherEffects condition={liveData.condition} />}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* FIGMA: STYLE_TARGET — Header bar (back button, title, island) */}
        <View style={styles.header}>
          {/* FIGMA: STYLE_TARGET — Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerName}>
              {locationName || station.name}
            </Text>
            <View style={styles.headerLocation}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.headerIsland}>
                {locationName ? station.island : station.island}
              </Text>
            </View>
            <View style={styles.headerStation}>
              <Ionicons name="radio-outline" size={12} color={colors.textMuted} />
              <Text style={styles.headerStationText}>
                {t('result.nearestAemetStation')}: {station.name}
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* High altitude fallback info banner */}
        {isHighAltitudeFallback && (
          <View style={styles.fallbackBanner}>
            <Ionicons name="information-circle" size={16} color={colors.textMuted} />
            <Text style={styles.fallbackBannerText}>
              {t('result.highAltitudeFallback', { station: station?.name })}
            </Text>
          </View>
        )}

        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textPrimary}
              colors={[colors.textPrimary]}
              progressBackgroundColor="transparent"
            />
          }
        >

        {/* Sun Chance Gauge - show loading state or actual data, hide when offline with no data */}
        {(isLoading || (sunChanceResult && sunChanceResult.total_days > 0)) && (
          <SunChanceGauge
            percentage={sunChanceResult?.sun_chance ?? 0}
            confidence={sunChanceResult?.confidence ?? 'low'}
            isLoading={isLoading}
            onInfoPress={() => setShowSunChanceModal(true)}
            selectedMonth={selectedMonth}
          />
        )}

        {sunChanceResult && sunChanceResult.total_days > 0 && !isLoading && (
          <View style={styles.statsInfo}>
            <Text style={styles.statsText}>
              {t('result.basedOnDays', {
                station: sunChanceFallback?.name || station?.name
              })}
            </Text>
          </View>
        )}

        {/* FIGMA: STYLE_TARGET — Temperature cards row (only when we have data) */}
        {currentStats && currentStats.total_days > 0 && !isLoading && (
          <View style={styles.tempCards}>
            <GlassCard style={styles.tempCard} delay={200}>
              <View style={styles.tempCardInner}>
                <MaterialCommunityIcons name="thermometer-high" size={28} color={colors.tempHot} />
                <Text style={styles.tempLabel}>{t('result.avgMax')}</Text>
                <Text style={[styles.tempValue, styles.tempValueHigh]}>{currentStats.avg_tmax.toFixed(1)}°C</Text>
              </View>
            </GlassCard>
            <GlassCard style={styles.tempCard} delay={300}>
              <View style={styles.tempCardInner}>
                <MaterialCommunityIcons name="thermometer-low" size={28} color={colors.tempCold} />
                <Text style={styles.tempLabel}>{t('result.avgMin')}</Text>
                <Text style={[styles.tempValue, styles.tempValueLow]}>{currentStats.avg_tmin.toFixed(1)}°C</Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* FIGMA: STYLE_TARGET — Month selector chips */}
        <View style={styles.monthSelector}>
          {MONTH_KEYS.map((monthKey, i) => (
            <TouchableOpacity key={i} style={[styles.monthBtn, selectedMonth === i + 1 && styles.monthBtnActive]} onPress={() => handleMonthSelect(i + 1)}>
              <Text style={[styles.monthBtnText, selectedMonth === i + 1 && styles.monthBtnTextActive]}>{t(`monthsShort.${monthKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calima Alert - displayed when Saharan dust storm is detected (PM10 > 50 µg/m³) */}
        <AlertCard type="calima" visible={calimaStatus?.isDetected ?? false} />

        {/* Live Weather Card — real-time data from Open-Meteo */}
        <LiveWeatherCard data={liveData} isLoading={isLoadingLive} hasError={liveError} isFromCache={isFromCache} />

        {/* FIGMA: STYLE_TARGET — History section (year cards) */}
        {yearlyData.length > 0 && !isLoading && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.historyTitle}>{t('result.last10Years')}</Text>
            </View>
            {yearlyData.map((d, index) => <YearHistoryItem key={d.year} data={d} month={selectedMonth} delay={400 + index * 50} />)}
          </View>
        )}

        {/* FIGMA: STYLE_TARGET — Summary card (only show when we have actual data) */}
        {sunChanceResult && sunChanceResult.total_days > 0 && !isLoading && (
          <GlassCard style={styles.summaryContainer} delay={900}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="information-circle" size={20} color={colors.rain} />
                <Text style={styles.summaryTitle}>{t('result.summary')}</Text>
              </View>
              <Text style={styles.summaryText}>{getSummary()}</Text>
            </View>
          </GlassCard>
        )}

        {/* FIGMA: STYLE_TARGET — Best time section (top 3 weeks) */}
        {bestWeeks.length > 0 && !isLoading && (
          <View style={styles.bestTimeSection}>
            <View style={styles.bestTimeHeader}>
              <MaterialCommunityIcons name="trophy" size={22} color={colors.accent} />
              <Text style={styles.bestTimeTitle}>{t('result.bestTimeToVisit')}</Text>
            </View>
            <Text style={styles.bestTimeSubtitle}>{t('result.top3Weeks')}</Text>
            {bestWeeks.map((week, index) => (
              <BestTimeCard key={week.weekStart} week={week} rank={index} delay={1000 + index * 100} />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
      </SafeAreaView>

      {/* Sun Chance Info Modal */}
      <SunChanceModal
        visible={showSunChanceModal}
        onClose={() => setShowSunChanceModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bgImage: { opacity: 0.3 },
  bgGradientOverlay: { opacity: 0.85 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  // FIGMA: STYLE_TARGET — Back button (bg, radius, size)
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.glassBg, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, marginLeft: spacing.md },
  headerName: { ...typography.h2 },
  headerLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerIsland: { ...typography.bodySmall, marginLeft: spacing.xs },
  headerStation: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  headerStationText: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.xs },
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  monthSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  // FIGMA: STYLE_TARGET — Month chip (bg, radius, padding)
  monthBtn: {
    width: '16%',
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...glass.chip,
  },
  // FIGMA: STYLE_TARGET — Active month chip (bg color)
  monthBtnActive: { backgroundColor: colors.primary },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  monthBtnTextActive: { color: colors.textPrimary, fontWeight: '700' },
  statsInfo: { alignItems: 'center', marginBottom: spacing.sm },
  statsText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  tempCards: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm },
  // FIGMA: STYLE_TARGET — Temperature card (glassmorphism)
  tempCard: { flex: 1 },
  tempCardInner: { padding: spacing.md, alignItems: 'center' },
  tempLabel: { ...typography.label, color: glassText.secondary, marginTop: spacing.sm, textAlign: 'center', flexShrink: 1 },
  tempValue: { ...typography.value, marginTop: spacing.xs },
  tempValueHigh: { color: colors.tempHot },
  tempValueLow: { color: colors.tempCold },
  historySection: { marginTop: spacing.sm },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  historyTitle: {
    ...typography.h3,
    marginLeft: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // FIGMA: STYLE_TARGET — Year history item (glassmorphism timeline)
  yearItem: {
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  yearItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  yearItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  // Column 1: Year + Icon
  yearCol1: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    gap: spacing.xs,
  },
  yearItemYear: {
    fontSize: 14,
    fontWeight: '700',
    color: glassText.primary,
    letterSpacing: -0.3,
  },
  // Column 2: Progress Bar + Percentage
  yearCol2: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  sunBarWrapper: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sunBarBackground: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  sunBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sunBarGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'transparent',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  sunBarPercent: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Column 3: Temperatures
  yearCol3: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tempHigh: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.tempHot,
  },
  tempSeparator: {
    fontSize: 13,
    color: glassText.muted,
    marginHorizontal: 2,
  },
  tempLow: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.tempCold,
  },
  // FIGMA: STYLE_TARGET — Summary card (glassmorphism)
  summaryContainer: { marginTop: spacing.lg },
  summaryInner: { padding: spacing.lg },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: glassText.primary,
    marginLeft: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  summaryText: { fontSize: 15, color: glassText.secondary, lineHeight: 22 },
  bottomSpacer: { height: 40 },
  bestTimeSection: { marginTop: spacing.lg },
  bestTimeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  bestTimeTitle: {
    ...typography.h3,
    marginLeft: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bestTimeSubtitle: { ...typography.label, marginBottom: spacing.md, marginLeft: 30 },
  // FIGMA: STYLE_TARGET — Best time card (glassmorphism)
  bestTimeCard: { marginBottom: spacing.sm },
  bestTimeCardInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  bestTimeRank: { width: 36, alignItems: 'center' },
  bestTimeContent: { flex: 1, marginLeft: spacing.sm },
  bestTimeDate: { fontSize: 15, fontWeight: '600', color: glassText.primary },
  bestTimeMonth: { ...typography.caption, marginTop: 2, color: glassText.secondary },
  bestTimeStats: { alignItems: 'flex-end' },
  bestTimeStat: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  bestTimeValue: { fontSize: 14, fontWeight: '700', marginLeft: spacing.xs },
  bestTimeTemp: { fontSize: 13, color: colors.tempHot, marginLeft: spacing.xs },
  // ─── LIVE WEATHER CARD (Figma Glassmorphism) ─────────────────────────────────
  // FIGMA: STYLE_TARGET — LiveWeatherCard
  liveCard: {
    marginBottom: spacing.md,
    minHeight: liveCard.minHeight,
  },
  liveCardInner: {
    padding: liveCard.padding,
    minHeight: liveCard.minHeight - 2, // account for border
  },
  // Figma: Top row layout - tighter spacing
  liveTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  // Figma: Live Badge - compact, subtle but clear
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.liveBadgeBg,
    borderWidth: 1,
    borderColor: colors.liveBadgeBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.liveGreen,
    marginRight: spacing.xs,
  },
  liveBadgeText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Figma: Temperature - 60px bold
  liveTempValue: {
    fontSize: typography.liveTemperature.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -2,
    // Text shadow for readability on gradient
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Figma: Bottom row layout
  liveBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
  },
  // Figma: Wind section (left side)
  liveWindSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  liveWindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveWindRowLast: {
    marginBottom: 0,
  },
  liveWindText: {
    fontSize: typography.liveInfo.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
    // Text shadow for readability
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Parameter icons (wind, humidity) - small with subtle glow
  parameterIconWrapper: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  parameterIcon: {
    opacity: 0.6,
  },
  // Figma: Weather icon section (right side) - label aligned with Humidity
  liveWeatherSection: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Condition label - same typography as Wind/Humidity for consistency
  liveConditionLabel: {
    fontSize: typography.liveInfo.fontSize,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 110,
    lineHeight: typography.liveInfo.lineHeight,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Offline state
  liveBadgeOffline: {
    backgroundColor: 'rgba(134, 142, 150, 0.15)',
    borderColor: 'rgba(134, 142, 150, 0.3)',
  },
  // Cache state (data from offline storage)
  liveBadgeCache: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  liveBadgeTextCache: {
    color: colors.textMuted,
  },
  cacheIndicator: {
    alignItems: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  cacheIndicatorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cacheIndicatorText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  liveOfflineContent: {
    alignItems: 'flex-start',
  },
  liveOfflineText: {
    ...typography.body,
    color: glassText.secondary,
    marginTop: spacing.sm,
  },
  liveOfflineHint: {
    fontSize: 12,
    color: glassText.muted,
    marginTop: spacing.xs,
  },
  // Skeleton loading
  skeleton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  skeletonTempLarge: {
    width: 140,
    height: 66,
  },
  skeletonWind: {
    width: 150,
    height: 24,
  },
  skeletonIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  // ─── ERROR ──────────────────────────────────────────────────────────────────
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error, fontSize: 18, marginBottom: spacing.md },
  errorButton: { color: colors.primary, fontSize: 16, fontWeight: '600' },

  // ─── HIGH ALTITUDE FALLBACK BANNER ─────────────────────────────────────────
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fallbackBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
