import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

import { MONTH_KEYS } from '../i18n';

import { light, spacing, typography, borderRadius, fonts } from '../constants/theme';
import { GlassCard } from './GlassCard';
import { WindStabilityResult } from '../services/weatherService';

interface TradeWindStabilityCardProps {
  stability: WindStabilityResult;
  monthName: string;
  month: number;
  // Trade winds (alisios) only occur in the Canaries. Outside them we show the
  // same wind-consistency metric but with generic wording (no "trade winds").
  isTradeWind?: boolean;
  delay?: number;
}

const GOLD_COLOR = '#FFC107';
const SILVER_COLOR = '#A0AEC0';
const BRONZE_COLOR = '#CD7F32';

function getStabilityColor(stability: number): string {
  if (stability >= 80) return GOLD_COLOR;
  if (stability >= 60) return SILVER_COLOR;
  return BRONZE_COLOR;
}

function getStabilityLevel(stability: number): 'high' | 'medium' | 'low' {
  if (stability >= 80) return 'high';
  if (stability >= 60) return 'medium';
  return 'low';
}

export function TradeWindStabilityCard({
  stability,
  monthName,
  month,
  isTradeWind = true,
  delay = 0,
}: TradeWindStabilityCardProps) {
  const { t } = useTranslation();

  // Use locative form for Polish
  const monthForDescription = i18n.language === 'pl'
    ? t(`monthsLocative.${MONTH_KEYS[month - 1]}`)
    : monthName;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const stabilityColor = useMemo(
    () => getStabilityColor(stability.stability),
    [stability.stability]
  );

  const stabilityLevel = useMemo(
    () => getStabilityLevel(stability.stability),
    [stability.stability]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: stability.stability / 100,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, delay + 200);

    return () => clearTimeout(timeout);
  }, [stability.stability, delay, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (stability.sampleCount === 0) {
    return null;
  }

  return (
    <GlassCard scheme="light" style={styles.card} delay={delay}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="weather-windy"
            size={20}
            color={stabilityColor}
          />
          <Text style={styles.title}>
            {t(isTradeWind ? 'wind.stabilityTitle' : 'wind.stabilityTitle_generic')}
          </Text>
        </View>

        {/* Stability value */}
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: stabilityColor }]}>
            {stability.stability}%
          </Text>
          <Text style={styles.valueLabel}>
            {t(`wind.stability_${stabilityLevel}`)}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth,
                  backgroundColor: stabilityColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {t(
            isTradeWind
              ? `wind.stabilityDesc_${stabilityLevel}`
              : `wind.stabilityDescGeneric_${stabilityLevel}`,
            { month: monthForDescription }
          )}
        </Text>

        {/* Stats tiles */}
        <View style={styles.tileRow}>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons name="speedometer-outline" size={18} color={light.colors.primary} />
            </View>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {stability.averageSpeed}<Text style={styles.tileUnit}> km/h</Text>
            </Text>
            <Text style={styles.tileLabel}>{t('wind.avgSpeed')}</Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons name="trending-up" size={18} color={light.colors.primary} />
            </View>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {stability.windRange.min}–{stability.windRange.max}<Text style={styles.tileUnit}> km/h</Text>
            </Text>
            <Text style={styles.tileLabel}>{t('wind.windRange')}</Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons name="calendar-outline" size={18} color={light.colors.primary} />
            </View>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {t('wind.daysText', { count: stability.windyDays })}
            </Text>
            <Text style={styles.tileLabel}>{t('wind.windyDays')}</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inner: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.h3, fontFamily: fonts.semibold,
    color: light.colors.textPrimary,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontSize: 48, fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -2,
  },
  valueLabel: {
    ...typography.label, fontFamily: fonts.medium,
    color: light.colors.textSecondary,
    marginTop: -4,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    ...typography.body, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
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
    backgroundColor: light.colors.primarySoft,
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
});
