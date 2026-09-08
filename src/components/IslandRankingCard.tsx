import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

import { light, spacing, typography, fonts } from '../constants/theme';
import { MONTH_KEYS } from '../i18n';
import {
  getRegionForIsland,
  ISLAND_TRANSLATION_KEYS,
  formatRankingIslandName,
} from '../constants/regions';
import { IslandRanking } from '../services/weatherService';
import { GlassCard } from './GlassCard';

interface IslandRankingCardProps {
  kind: 'wind' | 'rain';
  // Full ranking across all regions; filtered to the current location's region here.
  ranking: IslandRanking[];
  island: string;
  month: number;
  delay?: number;
}

/**
 * Shared "island ranking" card for the Wind and Rain detail screens. Filters the
 * ranking to the current location's region, picks a region-aware title, and
 * renders the bars. Only the value unit, icon and highlight colour differ by kind.
 */
export function IslandRankingCard({ kind, ranking, island, month, delay = 0 }: IslandRankingCardProps) {
  const { t } = useTranslation();
  const region = getRegionForIsland(island);

  const regionRanking = useMemo(
    () => ranking.filter((r) => getRegionForIsland(r.island) === region),
    [ranking, region]
  );

  if (regionRanking.length === 0) return null;

  const monthLabel =
    i18n.language === 'pl'
      ? t(`monthsLocative.${MONTH_KEYS[month - 1]}`)
      : t(`months.${MONTH_KEYS[month - 1]}`);

  const titleKey =
    region === 'canary'
      ? `${kind}.island_ranking_title`
      : `${kind}.island_ranking_title_${region}`;
  const unit = kind === 'wind' ? 'km/h' : 'mm';
  const iconColor = kind === 'wind' ? light.colors.cloud : light.colors.rain;
  const highlightColor = kind === 'wind' ? light.colors.primary : light.colors.rain;
  const maxValue = regionRanking[0]?.value || 1;

  return (
    <GlassCard scheme="light" style={styles.rankingCard} delay={delay}>
      <View style={styles.rankingInner}>
        <View style={styles.rankingHeader}>
          <MaterialCommunityIcons name="podium" size={20} color={iconColor} />
          <View style={styles.rankingTitleContainer}>
            <Text style={styles.rankingTitle}>{t(titleKey, { month: monthLabel })}</Text>
            <Text style={styles.rankingSubtitle}>{t(`${kind}.island_ranking_month`)}</Text>
          </View>
        </View>
        {regionRanking.map((item, index) => {
          const isCurrentIsland = item.island === island;
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const translationKey = ISLAND_TRANSLATION_KEYS[item.island];
          const translatedIsland = formatRankingIslandName(
            translationKey ? t(`islands.${translationKey}`) : item.island
          );

          return (
            <View key={item.island} style={styles.rankingRow}>
              <Text style={styles.rankingPosition}>{index + 1}.</Text>
              <Text
                style={[styles.rankingIsland, isCurrentIsland && { color: highlightColor, fontFamily: fonts.semibold }]}
                numberOfLines={1}
              >
                {translatedIsland}
              </Text>
              <View style={styles.rankingBarContainer}>
                <View
                  style={[
                    styles.rankingBar,
                    { width: `${Math.max(barWidth, 2)}%` },
                    isCurrentIsland && { backgroundColor: highlightColor },
                  ]}
                />
              </View>
              <Text
                style={[styles.rankingValue, isCurrentIsland && { color: highlightColor, fontFamily: fonts.semibold }]}
                numberOfLines={1}
              >
                {item.value} {unit}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
  rankingValue: {
    width: 80,
    fontSize: 13, fontFamily: fonts.regular,
    color: light.colors.textSecondary,
    textAlign: 'right',
  },
});
