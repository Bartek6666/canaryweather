import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '../constants/theme';

interface ScreenHeaderProps {
  locationName?: string;
  stationName: string;
  island: string;
  onBack: () => void;
}

export function ScreenHeader({ locationName, stationName, island, onBack }: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
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
  );
}

const styles = StyleSheet.create({
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
});
