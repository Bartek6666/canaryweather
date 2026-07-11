import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import Svg, { Circle } from 'react-native-svg';

import { light, spacing, typography, borderRadius, fonts } from '../constants/theme';
import { GlassCard, ScreenHeader } from '../components';
import { trackRainDetailsView } from '../services/analyticsService';
import { calculateRainStats, RainStatsResult, getRainRankingByIsland, IslandRanking } from '../services/weatherService';
import { RootStackParamList } from '../../App';
import { MONTH_KEYS } from '../i18n';
import { getRegionForIsland, ISLAND_TRANSLATION_KEYS, formatRankingIslandName } from '../constants/regions';

type Props = NativeStackScreenProps<RootStackParamList, 'RainDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_SIZE = Math.min(SCREEN_WIDTH * 0.75, 300);
const STROKE_WIDTH = 10;

/**
 * Returns the number of days in a given month (uses non-leap year)
 */
function getDaysInMonth(month: number): number {
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysPerMonth[month - 1] || 30;
}

/**
 * Gets color for dry day percentage gauge
 * Uses blue gradient: light blue (low) to navy (high)
 */
function getDryDayColor(percentage: number): string {
  if (percentage >= 85) return '#1e3a5f'; // Excellent - navy
  if (percentage >= 70) return '#2563eb'; // Very good - blue
  if (percentage >= 55) return '#3b82f6'; // Good - medium blue
  if (percentage >= 40) return '#60a5fa'; // Moderate - light blue
  return '#93c5fd'; // Low - very light blue
}

export default function RainDetailsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { stationId, month, stationName, locationName, island } = route.params;
  const region = getRegionForIsland(island);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;

  // Rain stats state
  const [rainStats, setRainStats] = useState<RainStatsResult | null>(null);
  const [islandRanking, setIslandRanking] = useState<IslandRanking[]>([]);

  // Track view on mount
  useEffect(() => {
    trackRainDetailsView({ stationId, month });
  }, [stationId, month]);

  // Fetch rain stats data (fast)
  useEffect(() => {
    const fetchStats = async () => {
      const stats = await calculateRainStats(stationId, month);
      setRainStats(stats);
    };
    fetchStats();
  }, [stationId, month]);

  // Fetch island ranking (slower - separate to not block other data)
  useEffect(() => {
    const fetchRanking = async () => {
      const ranking = await getRainRankingByIsland(month);
      setIslandRanking(ranking);
    };
    fetchRanking();
  }, [month]);

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(gaugeAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, gaugeAnim]);

  const monthName = t(`months.${MONTH_KEYS[month - 1]}`);

  // Ranking is grouped across all regions; show only the current region's
  // islands/areas so a Balearic/mainland location isn't ranked against Canaries.
  const regionRanking = useMemo(
    () => islandRanking.filter((r) => getRegionForIsland(r.island) === region),
    [islandRanking, region]
  );
  const rankingTitleKey =
    region === 'canary'
      ? 'rain.island_ranking_title'
      : `rain.island_ranking_title_${region}`;

  // SVG gauge calculations
  const radius = (GAUGE_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dryPercentage = rainStats?.daysWithoutRain ?? 0;
  const gaugeColor = getDryDayColor(dryPercentage);

  const animatedStrokeDashoffset = gaugeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - dryPercentage / 100)],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Background gradient (light) */}
      <LinearGradient
        colors={[...light.gradient]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          locationName={locationName}
          stationName={stationName}
          island={island}
          onBack={() => navigation.goBack()}
          scheme="light"
        />

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Month indicator */}
          <View style={styles.monthBadge}>
            <Ionicons name="calendar-outline" size={16} color={light.colors.primary} />
            <Text style={styles.monthBadgeText}>{monthName}</Text>
          </View>

          {/* Hero Gauge - Days without rain */}
          <View style={styles.gaugeContainer}>
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={styles.gaugeSvg}>
              {/* Background circle */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={radius}
                stroke="rgba(0, 0, 0, 0.06)"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />
              {/* Animated progress circle */}
              <AnimatedCircle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={radius}
                stroke={gaugeColor}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={animatedStrokeDashoffset}
                rotation="-90"
                origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
              />
            </Svg>

            {/* Center content */}
            <View style={styles.gaugeCenter}>
              <Ionicons
                name="umbrella-outline"
                size={36}
                color={gaugeColor}
                style={styles.gaugeIcon}
              />
              <Text style={styles.gaugeValue}>{dryPercentage}%</Text>
              <Text style={styles.gaugeLabel}>{t('rain.days_without_rain')}</Text>

              {/* Confidence badge */}
              {rainStats && (
                <View style={[styles.confidenceBadge, { borderColor: light.colors.rain }]}>
                  <Ionicons
                    name={rainStats.confidence === 'high' ? 'checkmark-circle' : rainStats.confidence === 'medium' ? 'ellipse-outline' : 'alert-circle-outline'}
                    size={14}
                    color={light.colors.rain}
                  />
                  <Text style={[styles.confidenceText, { color: light.colors.rain }]}>
                    {t(`result.confidence${rainStats.confidence.charAt(0).toUpperCase() + rainStats.confidence.slice(1)}`)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Rain Intensity Info Card */}
          {rainStats && rainStats.sampleCount > 0 && (
            <GlassCard scheme="light" style={styles.intensityCard} delay={450}>
              <View style={styles.intensityInner}>
                <View style={styles.intensityHeader}>
                  <Ionicons name="water" size={20} color={light.colors.rain} />
                  <View style={styles.intensityTitleContainer}>
                    <Text style={styles.intensityTitle}>{t('rain.intensity_info')}</Text>
                    <Text style={styles.intensitySubtitle}>{locationName || stationName}</Text>
                    <View style={styles.intensityCaption}>
                      <Ionicons name="time-outline" size={14} color={light.colors.textMuted} />
                      <Text style={styles.intensityCaptionText}>{t('rain.basedOnMeasurements')}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tileRow}>
                  <View style={styles.tile}>
                    <View style={styles.tileIconCircle}>
                      <Ionicons name="rainy-outline" size={18} color={light.colors.rain} />
                    </View>
                    <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
                      {rainStats.averagePrecip}<Text style={styles.tileUnit}> mm</Text>
                    </Text>
                    <Text style={styles.tileLabel}>{t('rain.avg_precip')}</Text>
                  </View>
                  <View style={styles.tile}>
                    <View style={styles.tileIconCircle}>
                      <Ionicons name="calendar-outline" size={18} color={light.colors.rain} />
                    </View>
                    <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
                      {rainStats.rainyDaysPerYear} <Text style={styles.tileUnit}>{t('rain.of_days', { total: getDaysInMonth(month) })}</Text>
                    </Text>
                    <Text style={styles.tileLabel}>{t('rain.rainy_days_avg')}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Historical Context Card */}
          <GlassCard scheme="light" style={styles.contextCard} delay={550}>
            <View style={styles.contextInner}>
              <View style={styles.contextHeader}>
                <Ionicons name="time-outline" size={20} color={light.colors.rain} />
                <Text style={styles.contextTitle}>{t('rain.historical_context')}</Text>
              </View>
              <Text style={styles.contextText}>
                {t('rain.historical_description', {
                  month: i18n.language === 'pl'
                    ? t(`monthsLocative.${MONTH_KEYS[month - 1]}`)
                    : monthName,
                  station: stationName,
                  years: '2016-2025',
                })}
              </Text>
            </View>
          </GlassCard>

          {/* Island Rain Ranking */}
          {regionRanking.length > 0 && (
            <GlassCard scheme="light" style={styles.rankingCard} delay={750}>
              <View style={styles.rankingInner}>
                <View style={styles.rankingHeader}>
                  <MaterialCommunityIcons name="podium" size={20} color={light.colors.rain} />
                  <View style={styles.rankingTitleContainer}>
                    <Text style={styles.rankingTitle}>
                      {t(rankingTitleKey, {
                        month: i18n.language === 'pl'
                          ? t(`monthsLocative.${MONTH_KEYS[month - 1]}`)
                          : monthName
                      })}
                    </Text>
                    <Text style={styles.rankingSubtitle}>
                      {t('rain.island_ranking_month')}
                    </Text>
                  </View>
                </View>
                {regionRanking.map((item, index) => {
                  const isCurrentIsland = item.island === island;
                  const maxValue = regionRanking[0]?.value || 1;
                  const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  const translationKey = ISLAND_TRANSLATION_KEYS[item.island];
                  const translatedIsland = formatRankingIslandName(
                    translationKey ? t(`islands.${translationKey}`) : item.island
                  );

                  return (
                    <View key={item.island} style={styles.rankingRow}>
                      <Text style={styles.rankingPosition}>{index + 1}.</Text>
                      <Text style={[
                        styles.rankingIsland,
                        isCurrentIsland && styles.rankingIslandCurrent
                      ]} numberOfLines={1}>
                        {translatedIsland}
                      </Text>
                      <View style={styles.rankingBarContainer}>
                        <View style={[
                          styles.rankingBar,
                          { width: `${Math.max(barWidth, 2)}%` },
                          isCurrentIsland && styles.rankingBarCurrent
                        ]} />
                      </View>
                      <Text style={[
                        styles.rankingValue,
                        isCurrentIsland && styles.rankingValueCurrent
                      ]} numberOfLines={1}>
                        {item.value} mm
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Animated SVG Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: light.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: light.colors.border,
  },
  monthBadgeText: {
    ...typography.label, fontFamily: fonts.medium,
    color: light.colors.textPrimary,
  },
  gaugeContainer: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  gaugeSvg: {
    position: 'absolute',
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeIcon: {
    marginBottom: spacing.xs,
  },
  gaugeValue: {
    fontSize: 48, fontFamily: fonts.bold,
    fontWeight: '700',
    color: light.colors.textPrimary,
    letterSpacing: -2,
  },
  gaugeLabel: {
    ...typography.label, fontFamily: fonts.medium,
    color: light.colors.textSecondary,
    marginTop: -4,
    textAlign: 'center',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  confidenceText: {
    fontSize: 12, fontFamily: fonts.semibold,
    fontWeight: '600',
  },
  intensityCard: {
    width: '100%',
    marginBottom: spacing.md,
  },
  intensityInner: {
    padding: spacing.lg,
  },
  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  intensityTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  intensityTitle: {
    ...typography.h3, fontFamily: fonts.semibold,
    color: light.colors.textPrimary,
  },
  intensitySubtitle: {
    ...typography.bodySmall, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    marginTop: 2,
  },
  intensityCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  intensityCaptionText: {
    ...typography.label, fontFamily: fonts.medium,
    color: light.colors.textMuted,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: light.colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 133, 255, 0.1)',
    marginBottom: spacing.sm,
  },
  tileValue: {
    fontSize: 16, fontFamily: fonts.bold,
    fontWeight: '700',
    color: light.colors.textPrimary,
    textAlign: 'center',
  },
  tileUnit: {
    fontSize: 11, fontFamily: fonts.medium,
    fontWeight: '500',
    color: light.colors.textSecondary,
  },
  tileLabel: {
    fontSize: 12, fontFamily: fonts.semibold,
    fontWeight: '600',
    color: light.colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  contextCard: {
    width: '100%',
    marginBottom: spacing.md,
  },
  contextInner: {
    padding: spacing.lg,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contextTitle: {
    ...typography.h3, fontFamily: fonts.semibold,
    color: light.colors.textPrimary,
    marginLeft: spacing.sm,
  },
  contextText: {
    ...typography.body, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    lineHeight: 22,
  },
  rankingCard: {
    width: '100%',
    marginBottom: spacing.md,
  },
  rankingInner: {
    padding: spacing.lg,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  rankingTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rankingTitle: {
    ...typography.h3, fontFamily: fonts.semibold,
    color: light.colors.textPrimary,
  },
  rankingSubtitle: {
    ...typography.bodySmall, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    marginTop: 2,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankingPosition: {
    width: 24,
    fontSize: 13, fontFamily: fonts.semibold,
    fontWeight: '600',
    color: light.colors.textMuted,
  },
  rankingIsland: {
    width: 100,
    fontSize: 13, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
  },
  rankingIslandCurrent: {
    color: light.colors.rain,
    fontWeight: '600', fontFamily: fonts.semibold,
  },
  rankingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  rankingBar: {
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 4,
  },
  rankingBarCurrent: {
    backgroundColor: light.colors.rain,
  },
  rankingValue: {
    width: 80,
    fontSize: 13, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    textAlign: 'right',
  },
  rankingValueCurrent: {
    color: light.colors.rain,
    fontWeight: '600', fontFamily: fonts.semibold,
  },
  bottomSpacer: {
    height: 40,
  },
});
