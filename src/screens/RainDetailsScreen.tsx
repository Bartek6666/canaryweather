import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing, typography, gradients, borderRadius } from '../constants/theme';
import { GlassCard } from '../components';
import { trackRainDetailsView } from '../services/analyticsService';
import { calculateRainStats, RainStatsResult, getRainRankingByIsland, IslandRanking } from '../services/weatherService';
import { RootStackParamList } from '../../App';
import { MONTH_KEYS } from '../i18n';

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
    calculateRainStats(stationId, month).then(setRainStats);
  }, [stationId, month]);

  // Fetch island ranking (slower - separate to not block other data)
  useEffect(() => {
    getRainRankingByIsland(month).then(setIslandRanking);
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
      {/* Background gradient */}
      <LinearGradient
        colors={[...gradients.main]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerName}>{locationName || stationName}</Text>
            <View style={styles.headerLocation}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.headerIsland}>{island}</Text>
            </View>
            <View style={styles.headerStation}>
              <Ionicons name="radio-outline" size={12} color={colors.textMuted} />
              <Text style={styles.headerStationText}>
                {t('result.nearestAemetStation')}: {stationName}
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Month indicator */}
          <View style={styles.monthBadge}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
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
                stroke="rgba(255, 255, 255, 0.1)"
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
                <View style={[styles.confidenceBadge, { borderColor: colors.rain }]}>
                  <Ionicons
                    name={rainStats.confidence === 'high' ? 'checkmark-circle' : rainStats.confidence === 'medium' ? 'ellipse-outline' : 'alert-circle-outline'}
                    size={14}
                    color={colors.rain}
                  />
                  <Text style={[styles.confidenceText, { color: colors.rain }]}>
                    {t(`result.confidence${rainStats.confidence.charAt(0).toUpperCase() + rainStats.confidence.slice(1)}`)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Rain Intensity Info Card */}
          {rainStats && rainStats.sampleCount > 0 && (
            <GlassCard style={styles.intensityCard} delay={450}>
              <View style={styles.intensityInner}>
                <View style={styles.intensityHeader}>
                  <Ionicons name="water" size={20} color={colors.rain} />
                  <View style={styles.intensityTitleContainer}>
                    <Text style={styles.intensityTitle}>{t('rain.intensity_info')}</Text>
                    <Text style={styles.intensitySubtitle}>{locationName || stationName}</Text>
                  </View>
                </View>
                <View style={styles.intensityStats}>
                  <View style={styles.intensityStat}>
                    <Text style={styles.intensityStatValue}>{rainStats.averagePrecip} mm</Text>
                    <Text style={styles.intensityStatLabel}>{t('rain.avg_precip')}</Text>
                  </View>
                  <View style={styles.intensityStat}>
                    <Text style={styles.intensityStatValue}>
                      {rainStats.rainyDaysPerYear} {t('rain.of_days', { total: getDaysInMonth(month) })}
                    </Text>
                    <Text style={styles.intensityStatLabel}>{t('rain.rainy_days_avg')}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Historical Context Card */}
          <GlassCard style={styles.contextCard} delay={550}>
            <View style={styles.contextInner}>
              <View style={styles.contextHeader}>
                <Ionicons name="time-outline" size={20} color={colors.rain} />
                <Text style={styles.contextTitle}>{t('rain.historical_context')}</Text>
              </View>
              <Text style={styles.contextText}>
                {t('rain.historical_description', {
                  month: monthName,
                  station: stationName,
                  years: '2016-2025',
                })}
              </Text>
            </View>
          </GlassCard>

          {/* Island Rain Ranking */}
          {islandRanking.length > 0 && (
            <GlassCard style={styles.rankingCard} delay={750}>
              <View style={styles.rankingInner}>
                <View style={styles.rankingHeader}>
                  <MaterialCommunityIcons name="podium" size={20} color={colors.rain} />
                  <View style={styles.rankingTitleContainer}>
                    <Text style={styles.rankingTitle}>{t('rain.island_ranking_title')}</Text>
                    <Text style={styles.rankingSubtitle}>
                      {t('rain.island_ranking_month', {
                        month: i18n.language === 'pl'
                          ? t(`monthsLocative.${MONTH_KEYS[month - 1]}`)
                          : monthName
                      })}
                    </Text>
                  </View>
                </View>
                {islandRanking.map((item, index) => {
                  const isCurrentIsland = item.island === island;
                  const maxValue = islandRanking[0]?.value || 1;
                  const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                  return (
                    <View key={item.island} style={styles.rankingRow}>
                      <Text style={styles.rankingPosition}>{index + 1}.</Text>
                      <Text style={[
                        styles.rankingIsland,
                        isCurrentIsland && styles.rankingIslandCurrent
                      ]}>
                        {item.island}
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
                      ]}>
                        {item.value} {t('rain.days_short')}
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
    backgroundColor: '#0a1628',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerIsland: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  headerStation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerStationText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    width: 44,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  monthBadgeText: {
    ...typography.label,
    color: colors.textPrimary,
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
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  gaugeLabel: {
    ...typography.label,
    color: colors.textSecondary,
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
    fontSize: 12,
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
    ...typography.h3,
    color: colors.textPrimary,
  },
  intensitySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  intensityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  intensityStat: {
    alignItems: 'center',
  },
  intensityStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.rain,
  },
  intensityStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  contextText: {
    ...typography.body,
    color: colors.textSecondary,
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
    ...typography.h3,
    color: colors.textPrimary,
  },
  rankingSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankingPosition: {
    width: 24,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rankingIsland: {
    width: 100,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rankingIslandCurrent: {
    color: colors.rain,
    fontWeight: '600',
  },
  rankingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  rankingBar: {
    height: '100%',
    backgroundColor: 'rgba(77, 171, 247, 0.4)',
    borderRadius: 4,
  },
  rankingBarCurrent: {
    backgroundColor: colors.rain,
  },
  rankingValue: {
    width: 50,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rankingValueCurrent: {
    color: colors.rain,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
