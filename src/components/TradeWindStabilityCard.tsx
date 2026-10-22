import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  const stabilityColor = useMemo(
    () => getStabilityColor(stability.stability),
    [stability.stability]
  );

  const stabilityLevel = useMemo(
    () => getStabilityLevel(stability.stability),
    [stability.stability]
  );

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
            {t('wind.stabilityTitle')}
          </Text>
        </View>

        {/* Typical day range (mean ± std dev) + consistency level */}
        <View style={styles.valueContainer}>
          <Text style={styles.valueCaption}>{t('wind.typicalDay')}</Text>
          <Text style={styles.value}>
            {stability.windRange.min}–{stability.windRange.max}<Text style={styles.valueUnit}> km/h</Text>
          </Text>
          <Text style={[styles.valueLabel, { color: stabilityColor }]}>
            {t(`wind.stability_${stabilityLevel}`)}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {t(`wind.stabilityDescGeneric_${stabilityLevel}`, { month: monthForDescription })}
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
  valueCaption: {
    ...typography.label, fontFamily: fonts.medium,
    color: light.colors.textSecondary,
  },
  value: {
    fontSize: 40, fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -1,
    color: light.colors.textPrimary,
  },
  valueUnit: {
    fontSize: 18, fontFamily: fonts.medium,
    fontWeight: '500',
    letterSpacing: 0,
    color: light.colors.textSecondary,
  },
  valueLabel: {
    ...typography.label, fontFamily: fonts.semibold,
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
