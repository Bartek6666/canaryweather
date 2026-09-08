import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { colors, light, spacing, typography, fonts } from '../constants/theme';

interface ScreenHeaderProps {
  locationName?: string;
  stationName: string;
  island: string;
  onBack: () => void;
  /** Colour scheme — 'dark' (default) keeps the legacy dark screens working */
  scheme?: 'dark' | 'light';
}

export function ScreenHeader({ locationName, stationName, island, onBack, scheme = 'dark' }: ScreenHeaderProps) {
  const { t } = useTranslation();
  const c = scheme === 'light' ? light.colors : colors;

  return (
    <View style={styles.header}>
      <TouchableOpacity style={[styles.backButton, { backgroundColor: c.glassBg }]} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerTitle}>
        <Text style={[styles.headerName, { color: c.textPrimary }]}>{locationName || stationName}</Text>
        <View style={styles.headerLocation}>
          <Ionicons name="location" size={14} color={c.primary} />
          <Text style={[styles.headerIsland, { color: c.textSecondary }]}>{island}</Text>
        </View>
        <View style={styles.headerStation}>
          <Ionicons name="radio-outline" size={12} color={c.textMuted} />
          <Text style={[styles.headerStationText, { color: c.textMuted }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerName: {
    ...typography.h2, fontFamily: fonts.bold,
  },
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerIsland: {
    ...typography.bodySmall, fontFamily: fonts.regular,
    marginLeft: spacing.xs,
  },
  headerStation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerStationText: {
    fontSize: 12, fontFamily: fonts.regular,
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    width: 44,
  },
});
