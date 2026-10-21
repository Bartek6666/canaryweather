import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing, borderRadius, fonts, light } from '../constants/theme';
import { SunForecastDay } from '../services/weatherService';
import { MiniGauge } from './MiniGauge';
import { WeatherIcon } from './WeatherIcon';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface SunForecastDayModalProps {
  day: SunForecastDay | null;
  onClose: () => void;
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}

function InfoRow({ icon, iconColor, label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function uvLevelKey(uv: number): string {
  if (uv <= 2) return 'low';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  if (uv <= 10) return 'veryHigh';
  return 'extreme';
}

export function SunForecastDayModal({ day, onClose }: SunForecastDayModalProps) {
  const { t, i18n } = useTranslation();
  if (!day) return null;

  const decimal = (n: number) => (i18n.language.startsWith('en') ? String(n) : String(n).replace('.', ','));
  const [year, month, dayOfMonth] = day.date.split('-').map(Number);
  const weekday = new Date(year, month - 1, dayOfMonth).getDay();
  const dateLabel = `${t(`forecast.weekdaysFull.${WEEKDAY_KEYS[weekday]}`)} · ${String(dayOfMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}`;

  const rainValue = day.precipMm !== null && day.precipMm > 0
    ? `${day.precipProbability}% · ${decimal(day.precipMm)} mm`
    : `${day.precipProbability}%`;
  const windValue = day.windGusts !== null
    ? `${day.windMax} km/h · ${t('forecast.detail.gusts')} ${day.windGusts} km/h`
    : `${day.windMax} km/h`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.glassOverlay} />

              <View style={styles.content}>
                <View style={styles.header}>
                  <WeatherIcon condition={day.condition} size={24} />
                  <Text style={styles.title}>{dateLabel}</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={24} color={light.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.gauge}>
                  <MiniGauge
                    fraction={day.sunChance / 100}
                    value={String(day.sunChance)}
                    unit="%"
                    color={light.colors.accentDeep}
                    size={150}
                  />
                  <Text style={styles.gaugeLabel}>{t('forecast.detail.sunChance')}</Text>
                </View>

                <View style={styles.rows}>
                  {day.sunshineHours !== null && day.daylightHours !== null && (
                    <InfoRow
                      icon="sunny-outline"
                      iconColor={light.colors.accentDeep}
                      label={t('forecast.detail.sunshine')}
                      value={t('forecast.detail.sunshineValue', { sun: decimal(day.sunshineHours), day: decimal(day.daylightHours) })}
                    />
                  )}
                  <InfoRow
                    icon="thermometer-outline"
                    iconColor={light.colors.tempHot}
                    label={t('forecast.detail.temperature')}
                    value={`${day.tempMax}° / ${day.tempMin}°`}
                  />
                  <InfoRow
                    icon="umbrella-outline"
                    iconColor={light.colors.rain}
                    label={t('forecast.detail.rain')}
                    value={rainValue}
                  />
                  {day.windMax !== null && (
                    <InfoRow
                      icon="flag-outline"
                      iconColor={light.colors.primary}
                      label={t('forecast.detail.wind')}
                      value={windValue}
                    />
                  )}
                  {day.uvIndex !== null && (
                    <InfoRow
                      icon="glasses-outline"
                      iconColor={light.colors.warning}
                      label={t('forecast.detail.uv')}
                      value={`${day.uvIndex} · ${t(`forecast.detail.uvLevels.${uvLevelKey(day.uvIndex)}`)}`}
                    />
                  )}
                  {day.sunrise && day.sunset && (
                    <InfoRow
                      icon="time-outline"
                      iconColor={light.colors.textSecondary}
                      label={t('forecast.detail.sunriseSunset')}
                      value={`${day.sunrise} / ${day.sunset}`}
                    />
                  )}
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.closeButtonText}>{t('forecast.detail.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 55, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: light.colors.border,
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: light.colors.textPrimary,
  },
  gauge: {
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  gaugeLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: light.colors.textSecondary,
  },
  rows: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: light.colors.textSecondary,
  },
  rowValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: light.colors.textPrimary,
  },
  closeButton: {
    backgroundColor: light.colors.primary,
    paddingVertical: spacing.sm + 3,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
