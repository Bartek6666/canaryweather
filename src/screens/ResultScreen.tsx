import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { AlertCard, GlassCard, SunChanceGauge, WeatherIcon } from '../components';
import locationsMapping from '../constants/locations_mapping.json';
import { calculateSunChance, getMonthlyStats, getBestWeeksForStation, WeeklyBestPeriod, fetchLiveWeather, fetchCalimaStatus, CalimaStatus, LiveWeatherResult } from '../services/weatherService';
import { supabase } from '../services/supabase';
import { SunChanceResult, MonthlyStats, LiveWeatherData, WeatherCondition } from '../types';
import { MONTH_KEYS } from '../i18n';

// Satellite map background – place your image at assets/map_bg.jpg
const MAP_BG_SOURCE = require('../../assets/map_bg.jpg');

type RootStackParamList = { Search: undefined; Result: { stationId: string; locationAlias?: string } };
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
            <Text style={styles.cacheIndicatorText}>{t('result.offlineData')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}


function BestTimeCard({ week, rank, delay = 0 }: { week: WeeklyBestPeriod; rank: number; delay?: number }) {
  const medalColors = [colors.medalGold, colors.medalSilver, colors.medalBronze];
  // Map sunChance to weather condition for proper icon rendering
  const weatherCondition: WeatherCondition = week.sunChance >= 70 ? 'sunny' : week.sunChance >= 40 ? 'partly-sunny' : 'cloudy';

  return (
    <GlassCard style={styles.bestTimeCard} delay={delay}>
      <View style={styles.bestTimeCardInner}>
        <View style={styles.bestTimeRank}>
          <MaterialCommunityIcons name="medal" size={24} color={medalColors[rank]} />
        </View>
        <View style={styles.bestTimeContent}>
          <Text style={styles.bestTimeDate}>{week.dateRange}</Text>
          <Text style={styles.bestTimeMonth}>{week.monthName}</Text>
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
  // Map sunChance to weather condition for proper icon rendering
  const weatherCondition: WeatherCondition = sunChance >= 70 ? 'sunny' : sunChance >= 40 ? 'partly-sunny' : 'rainy';
  const monthKey = MONTH_KEYS[month - 1];

  return (
    <GlassCard style={styles.yearItem} variant="subtle" delay={delay}>
      <View style={styles.yearItemInner}>
        <View style={styles.yearItemLeft}>
          <Text style={styles.yearItemYear}>{t(`months.${monthKey}`)} {data.year}</Text>
          <Text style={styles.yearItemDays}>{data.sunnyDays}/{data.totalDays} {t('common.days')}</Text>
        </View>
        <View style={styles.yearItemCenter}>
          <WeatherIcon condition={weatherCondition} size={22} showGlow={true} />
          <Text style={[styles.yearItemChance, { color: getSunChanceColor(sunChance) }]}>{sunChance}%</Text>
        </View>
        <View style={styles.yearItemRight}>
          <Text style={styles.yearItemTemp}>
            <Text style={styles.tempHigh}>{data.avgTmax.toFixed(0)}°</Text>
            <Text style={styles.tempSep}> / </Text>
            <Text style={styles.tempLow}>{data.avgTmin.toFixed(0)}°</Text>
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default function ResultScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { stationId, locationAlias } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [sunChanceResult, setSunChanceResult] = useState<SunChanceResult | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [bestWeeks, setBestWeeks] = useState<WeeklyBestPeriod[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Live weather state
  const [liveData, setLiveData] = useState<LiveWeatherData | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Calima alert state (connected to Open-Meteo Air Quality API)
  const [calimaStatus, setCalimaStatus] = useState<CalimaStatus | null>(null);

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

      setIsLoadingLive(false);
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
      const status = await fetchCalimaStatus(station.latitude, station.longitude);
      setCalimaStatus(status);
    };

    loadCalimaStatus();

    // Refresh calima status every 30 minutes
    const interval = setInterval(loadCalimaStatus, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [station]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [sc, stats, yearly, weeks] = await Promise.all([
          calculateSunChance(stationId, selectedMonth),
          getMonthlyStats(stationId),
          fetchYearlyData(selectedMonth),
          getBestWeeksForStation(stationId),
        ]);
        setSunChanceResult(sc); setMonthlyStats(stats); setYearlyData(yearly); setBestWeeks(weeks);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [stationId, selectedMonth, fetchYearlyData]);

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
    const c = sunChanceResult?.sun_chance ?? 0;
    const monthKey = MONTH_KEYS[selectedMonth - 1];
    const monthName = t(`months.${monthKey}`).toLowerCase();
    if (c >= 80) return t('result.summaryExcellent', { name: station?.name, month: monthName });
    if (c >= 60) return t('result.summaryVeryGood', { name: station?.name });
    if (c >= 40) return t('result.summaryModerate');
    return t('result.summaryPoor');
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

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* FIGMA: STYLE_TARGET — Header bar (back button, title, island) */}
        <View style={styles.header}>
          {/* FIGMA: STYLE_TARGET — Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerName}>
              {locationAlias || station.name}
            </Text>
            <View style={styles.headerLocation}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.headerIsland}>
                {locationAlias ? `${station.name} • ${station.island}` : station.island}
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.ScrollView
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

        {/* Live Weather Card — real-time data from Open-Meteo */}
        <LiveWeatherCard data={liveData} isLoading={isLoadingLive} hasError={liveError} isFromCache={isFromCache} />

        {/* FIGMA: STYLE_TARGET — Month selector chips */}
        <View style={styles.monthSelector}>
          {MONTH_KEYS.map((monthKey, i) => (
            <TouchableOpacity key={i} style={[styles.monthBtn, selectedMonth === i + 1 && styles.monthBtnActive]} onPress={() => setSelectedMonth(i + 1)}>
              <Text style={[styles.monthBtnText, selectedMonth === i + 1 && styles.monthBtnTextActive]}>{t(`monthsShort.${monthKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calima Alert - displayed when Saharan dust storm is detected (PM10 > 50 µg/m³) */}
        <AlertCard type="calima" visible={calimaStatus?.isDetected ?? false} />

        {/* Sun Chance Gauge - show loading state or actual data, hide when offline with no data */}
        {(isLoading || (sunChanceResult && sunChanceResult.total_days > 0)) && (
          <SunChanceGauge percentage={sunChanceResult?.sun_chance ?? 0} confidence={sunChanceResult?.confidence ?? 'low'} isLoading={isLoading} />
        )}

        {sunChanceResult && sunChanceResult.total_days > 0 && !isLoading && (
          <View style={styles.statsInfo}><Text style={styles.statsText}>{t('result.basedOnDays', { count: sunChanceResult.total_days })}</Text></View>
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
    width: '15%',
    paddingVertical: 10,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...glass.chip,
  },
  // FIGMA: STYLE_TARGET — Active month chip (bg color)
  monthBtnActive: { backgroundColor: colors.primary },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  monthBtnTextActive: { color: colors.textPrimary, fontWeight: '700' },
  statsInfo: { alignItems: 'center', marginBottom: spacing.lg },
  statsText: { ...typography.label },
  tempCards: { flexDirection: 'row', marginBottom: spacing.lg },
  // FIGMA: STYLE_TARGET — Temperature card (glassmorphism)
  tempCard: { flex: 1, marginHorizontal: spacing.xs },
  tempCardInner: { padding: spacing.md, alignItems: 'center' },
  tempLabel: { ...typography.label, color: glassText.secondary, marginTop: spacing.sm, textAlign: 'center', flexShrink: 1 },
  tempValue: { ...typography.value, marginTop: spacing.xs },
  tempValueHigh: { color: colors.tempHot },
  tempValueLow: { color: colors.tempCold },
  historySection: { marginTop: spacing.lg },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  historyTitle: {
    ...typography.h3,
    marginLeft: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // FIGMA: STYLE_TARGET — Year history item (glassmorphism)
  yearItem: { marginBottom: spacing.sm },
  yearItemInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  yearItemLeft: { flex: 1 },
  yearItemYear: { ...typography.bodySmall, fontWeight: '600', color: glassText.primary },
  yearItemDays: { ...typography.caption, fontSize: 11, marginTop: 2, color: glassText.secondary },
  yearItemCenter: { alignItems: 'center', marginHorizontal: spacing.md },
  yearItemChance: { fontSize: 13, fontWeight: '700', marginTop: spacing.xs },
  yearItemRight: { alignItems: 'flex-end' },
  yearItemTemp: { fontSize: 13, color: glassText.primary },
  tempHigh: { color: colors.tempHot },
  tempSep: { color: colors.textPrimary },
  tempLow: { color: colors.tempCold },
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
});
