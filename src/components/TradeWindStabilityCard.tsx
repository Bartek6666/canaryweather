import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

import { MONTH_KEYS } from '../i18n';

import { colors, spacing, typography } from '../constants/theme';
import { GlassCard } from './GlassCard';
import { WindStabilityResult } from '../services/weatherService';

interface TradeWindStabilityCardProps {
  stability: WindStabilityResult;
  monthName: string;
  month: number;
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
    <GlassCard style={styles.card} delay={delay}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="weather-windy"
            size={20}
            color={stabilityColor}
          />
          <Text style={styles.title}>{t('wind.stabilityTitle')}</Text>
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
          {t(`wind.stabilityDesc_${stabilityLevel}`, { month: monthForDescription })}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('wind.avgSpeed')}</Text>
            <Text style={styles.statValue}>
              {stability.averageSpeed} <Text style={styles.statUnit}>km/h</Text>
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('wind.windRange')}</Text>
            <Text style={styles.statValue}>
              {stability.windRange.min}–{stability.windRange.max} <Text style={styles.statUnit}>km/h</Text>
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('wind.windyDays')}</Text>
            <Text style={styles.statValue}>{stability.windyDays}</Text>
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
    ...typography.h3,
    color: colors.textPrimary,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  valueLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: -4,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export default TradeWindStabilityCard;
