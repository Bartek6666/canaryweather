import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
import { GlassCard, TradeWindStabilityCard } from '../components';
import { trackWindDetailsView, trackWindStabilityView } from '../services/analyticsService';
import { calculateWindStability, WindStabilityResult, getWindRankingByIsland, IslandRanking } from '../services/weatherService';
import { RootStackParamList } from '../../App';
import { MONTH_KEYS } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'WindDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_SIZE = Math.min(SCREEN_WIDTH * 0.75, 300);
const STROKE_WIDTH = 10;

interface BeaufortScale {
  force: number;
  descriptionKey: string;
  minSpeed: number;
  maxSpeed: number;
  color: string;
}

const BEAUFORT_SCALE: BeaufortScale[] = [
  { force: 0, descriptionKey: 'calm', minSpeed: 0, maxSpeed: 1, color: '#A8E6CF' },
  { force: 1, descriptionKey: 'lightAir', minSpeed: 1, maxSpeed: 5, color: '#88D8B0' },
  { force: 2, descriptionKey: 'lightBreeze', minSpeed: 6, maxSpeed: 11, color: '#7EC8E3' },
  { force: 3, descriptionKey: 'gentleBreeze', minSpeed: 12, maxSpeed: 19, color: '#5DB4E0' },
  { force: 4, descriptionKey: 'moderateBreeze', minSpeed: 20, maxSpeed: 28, color: '#4DABF7' },
  { force: 5, descriptionKey: 'freshBreeze', minSpeed: 29, maxSpeed: 38, color: '#FFD93D' },
  { force: 6, descriptionKey: 'strongBreeze', minSpeed: 39, maxSpeed: 49, color: '#FF9500' },
  { force: 7, descriptionKey: 'nearGale', minSpeed: 50, maxSpeed: 61, color: '#FF6B6B' },
  { force: 8, descriptionKey: 'gale', minSpeed: 62, maxSpeed: 74, color: '#EE5A5A' },
  { force: 9, descriptionKey: 'strongGale', minSpeed: 75, maxSpeed: 88, color: '#DC3545' },
  { force: 10, descriptionKey: 'storm', minSpeed: 89, maxSpeed: 102, color: '#C82333' },
  { force: 11, descriptionKey: 'violentStorm', minSpeed: 103, maxSpeed: 117, color: '#A71D2A' },
  { force: 12, descriptionKey: 'hurricane', minSpeed: 118, maxSpeed: 999, color: '#721C24' },
];

function getBeaufortFromSpeed(speedKmh: number): BeaufortScale {
  for (const scale of BEAUFORT_SCALE) {
    if (speedKmh >= scale.minSpeed && speedKmh <= scale.maxSpeed) {
      return scale;
    }
  }
  return BEAUFORT_SCALE[0];
}

export default function WindDetailsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { stationId, month, stationName, averageSpeed, locationName, island } = route.params;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;

  // Wind stability state
  const [stability, setStability] = useState<WindStabilityResult | null>(null);
  // Island ranking state
  const [islandRanking, setIslandRanking] = useState<IslandRanking[]>([]);

  // Memoized Beaufort calculation
  const beaufort = useMemo(() => getBeaufortFromSpeed(averageSpeed), [averageSpeed]);

  // Track view on mount
  useEffect(() => {
    trackWindDetailsView({ stationId });
  }, [stationId]);

  // Fetch wind stability data (fast)
  useEffect(() => {
    calculateWindStability(stationId, month).then((result) => {
      setStability(result);
      if (result.sampleCount > 0) {
        trackWindStabilityView({ stationId, stability: result.stability, month });
      }
    });
  }, [stationId, month]);

  // Fetch island ranking (slower - separate to not block other data)
  useEffect(() => {
    getWindRankingByIsland(month).then(setIslandRanking);
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
  }, []);

  const monthName = t(`months.${MONTH_KEYS[month - 1]}`);

  // SVG gauge calculations
  const radius = (GAUGE_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  // Map speed to percentage (max ~60 km/h for typical Canary Islands wind)
  const maxDisplaySpeed = 60;
  const percentage = Math.min(averageSpeed / maxDisplaySpeed, 1);

  const animatedStrokeDashoffset = gaugeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - percentage)],
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

          {/* Hero Gauge */}
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
                stroke={beaufort.color}
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
              <MaterialCommunityIcons
                name="weather-windy"
                size={36}
                color={beaufort.color}
                style={styles.gaugeIcon}
              />
              <Text style={styles.gaugeValue}>{averageSpeed}</Text>
              <Text style={styles.gaugeUnit}>km/h</Text>

              {/* Beaufort scale info */}
              <View style={styles.beaufortInfo}>
                <Text style={[styles.beaufortForceInline, { color: beaufort.color }]}>
                  {beaufort.force}
                </Text>
                <Text style={styles.beaufortLabelInline}>
                  {t('wind.inBeaufortScale')}
                </Text>
              </View>
              <Text style={styles.beaufortDescription}>
                {t(`wind.beaufort.${beaufort.descriptionKey}`)}
              </Text>
            </View>
          </View>

          {/* Historical Context Card */}
          <GlassCard style={styles.contextCard} delay={450}>
            <View style={styles.contextInner}>
              <View style={styles.contextHeader}>
                <Ionicons name="time-outline" size={20} color={colors.rain} />
                <Text style={styles.contextTitle}>{t('wind.historicalContext')}</Text>
              </View>
              <Text style={styles.contextText}>
                {t('wind.historicalDescription', {
                  month: monthName,
                  station: stationName,
                  years: '2016-2025'
                })}
              </Text>
            </View>
          </GlassCard>

          {/* Trade Wind Stability Card */}
          {stability && stability.sampleCount > 0 && (
            <TradeWindStabilityCard
              stability={stability}
              monthName={monthName}
              month={month}
              delay={550}
            />
          )}

          {/* Island Wind Ranking */}
          {islandRanking.length > 0 && (
            <GlassCard style={styles.rankingCard} delay={650}>
              <View style={styles.rankingInner}>
                <View style={styles.rankingHeader}>
                  <MaterialCommunityIcons name="podium" size={20} color={colors.cloud} />
                  <View style={styles.rankingTitleContainer}>
                    <Text style={styles.rankingTitle}>{t('wind.island_ranking_title')}</Text>
                    <Text style={styles.rankingSubtitle}>
                      {t('wind.island_ranking_month', {
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
                  const barWidth = (item.value / maxValue) * 100;

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
                          { width: `${barWidth}%` },
                          isCurrentIsland && styles.rankingBarCurrent
                        ]} />
                      </View>
                      <Text style={[
                        styles.rankingValue,
                        isCurrentIsland && styles.rankingValueCurrent
                      ]}>
                        {item.value} km/h
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
  gaugeUnit: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: -4,
  },
  beaufortInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.md,
  },
  beaufortForceInline: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  beaufortLabelInline: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  beaufortDescription: {
    ...typography.body,
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
    color: colors.cloud,
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
    backgroundColor: 'rgba(173, 181, 189, 0.4)',
    borderRadius: 4,
  },
  rankingBarCurrent: {
    backgroundColor: colors.cloud,
  },
  rankingValue: {
    width: 60,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rankingValueCurrent: {
    color: colors.cloud,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
