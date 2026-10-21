import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { spacing, typography, light, fonts } from '../constants/theme';
import { SunForecastDay } from '../services/weatherService';
import { WeatherIcon } from './WeatherIcon';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface SunForecastStripProps {
  days: SunForecastDay[];
}

function sunChanceColor(sunChance: number): string {
  if (sunChance >= 70) return light.colors.accentDeep;
  if (sunChance >= 40) return light.colors.textSecondary;
  return light.colors.cloudDark;
}

export function SunForecastStrip({ days }: SunForecastStripProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={14} color={light.colors.textMuted} />
        <Text style={styles.title}>{t('forecast.title')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {days.map((day, i) => {
          const [year, month, dayOfMonth] = day.date.split('-').map(Number);
          const weekday = new Date(year, month - 1, dayOfMonth).getDay();
          const label = i === 0 ? t('forecast.today') : t(`forecast.weekdays.${WEEKDAY_KEYS[weekday]}`);

          return (
            <View key={day.date} style={styles.tile}>
              <Text style={styles.dayLabel}>{label}</Text>
              <WeatherIcon condition={day.condition} size={26} />
              <Text style={[styles.sunChance, { color: sunChanceColor(day.sunChance) }]}>{day.sunChance}%</Text>
              <Text style={styles.temps}>{day.tempMax}° / {day.tempMin}°</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.source}>{t('forecast.source')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.caption, fontFamily: fonts.medium,
    color: light.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  row: { gap: spacing.sm, paddingRight: spacing.sm },
  tile: {
    width: 68,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    backgroundColor: light.colors.surface,
    borderWidth: 1,
    borderColor: light.colors.border,
  },
  dayLabel: {
    ...typography.caption, fontFamily: fonts.medium,
    color: light.colors.textSecondary,
  },
  sunChance: {
    ...typography.body, fontFamily: fonts.bold,
  },
  temps: {
    ...typography.caption,
    color: light.colors.textMuted,
  },
  source: {
    ...typography.caption,
    color: light.colors.textMuted,
    marginTop: spacing.xs,
  },
});
