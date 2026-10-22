import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { spacing, fonts, light } from '../constants/theme';
import { SunForecastDay } from '../services/weatherService';
import { WeatherIcon } from './WeatherIcon';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Sun-chance tiers, same thresholds as the condition icons (sunny ≥70, partly ≥40)
const TIER_HIGH = light.colors.accentDeep;
const TIER_MID = light.colors.accent;
const TIER_LOW = 'rgba(0, 82, 212, 0.55)';

function tierColor(sunChance: number): string {
  if (sunChance >= 70) return TIER_HIGH;
  if (sunChance >= 40) return TIER_MID;
  return TIER_LOW;
}

function levelKey(sunChance: number): string {
  if (sunChance >= 70) return 'result.sunChanceLevelHigh';
  if (sunChance >= 40) return 'result.sunChanceLevelMedium';
  return 'result.sunChanceLevelLow';
}

function uvLevelKey(uv: number): string {
  if (uv <= 2) return 'low';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  if (uv <= 10) return 'veryHigh';
  return 'extreme';
}

function parseDate(date: string) {
  const [year, month, dayOfMonth] = date.split('-').map(Number);
  return { month, dayOfMonth, weekday: new Date(year, month - 1, dayOfMonth).getDay() };
}

// ─── Day ring: smaller sibling of the main SunChanceGauge (same amber gradient) ───

const RING_SIZE = 176;
const RING_STROKE = 14;
// Text must stay inside the ring's hole
const RING_TEXT_WIDTH = (RING_SIZE - RING_STROKE * 2) * 0.82;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = RING_SIZE / 2;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_SEGMENTS = 40;

function amberAt(t: number): string {
  // #FDE68A → #FBBF24 → #F59E0B, as in SunChanceGauge
  const stops = [[253, 230, 138], [251, 191, 36], [245, 158, 11]];
  const v = Math.max(0, Math.min(1, t)) * 2;
  const i = Math.min(Math.floor(v), 1);
  const f = v - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(', ')})`;
}

function DayRing({ sunChance, label, level }: { sunChance: number; label: string; level: string }) {
  const progress = Math.max(0, Math.min(sunChance, 100)) / 100;
  const active = Math.ceil(progress * RING_SEGMENTS);
  const segLen = RING_CIRC / RING_SEGMENTS;
  const endAngle = (-90 + progress * 360) * (Math.PI / 180);

  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={RING_C} cy={RING_C} r={RING_R} fill="none" stroke="rgba(253, 230, 138, 0.6)" strokeWidth={RING_STROKE} strokeDasharray="2 3" />
        <G>
          {Array.from({ length: active }, (_, i) => {
            const len = i === active - 1 ? segLen * (progress * RING_SEGMENTS - i) : segLen;
            return (
              <Circle
                key={i}
                cx={RING_C}
                cy={RING_C}
                r={RING_R}
                fill="none"
                stroke={amberAt(i / RING_SEGMENTS / progress)}
                strokeWidth={RING_STROKE}
                strokeLinecap={i === 0 ? 'round' : 'butt'}
                strokeDasharray={`${len} ${RING_CIRC}`}
                rotation={-90 + (i * 360) / RING_SEGMENTS}
                origin={`${RING_C}, ${RING_C}`}
              />
            );
          })}
          {active > 0 && (
            <Circle cx={RING_C + RING_R * Math.cos(endAngle)} cy={RING_C + RING_R * Math.sin(endAngle)} r={RING_STROKE / 2} fill={amberAt(1)} />
          )}
        </G>
      </Svg>
      <Text style={styles.ringValue}>{sunChance}%</Text>
      <Text style={styles.ringLabel} numberOfLines={2}>{label}</Text>
      <Text style={styles.ringLevel} numberOfLines={1}>{level}</Text>
    </View>
  );
}

// ─── Rows ───

function InfoRow({ icon, value, label, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.divider]}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Sheet ───

interface SunForecastSheetProps {
  visible: boolean;
  days: SunForecastDay[];
  onClose: () => void;
}

export function SunForecastSheet({ visible, days, onClose }: SunForecastSheetProps) {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState<SunForecastDay | null>(null);

  // Always reopen on the list
  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  const decimal = (n: number) => (i18n.language.startsWith('en') ? String(n) : String(n).replace('.', ','));

  const renderList = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('forecast.title')}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={light.colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {days.map((day, i) => {
          const { weekday } = parseDate(day.date);
          return (
            <TouchableOpacity
              key={day.date}
              style={[styles.dayRow, i < days.length - 1 && styles.divider]}
              onPress={() => setSelected(day)}
              activeOpacity={0.6}
            >
              <Text style={[styles.dayLabel, i === 0 && styles.dayLabelToday]} numberOfLines={1}>
                {i === 0 ? t('forecast.today') : t(`forecast.weekdays.${WEEKDAY_KEYS[weekday]}`)}
              </Text>
              <View style={styles.dayIcon}>
                <WeatherIcon condition={day.condition} size={24} />
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${day.sunChance}%`, backgroundColor: tierColor(day.sunChance) }]} />
              </View>
              <Text style={styles.dayPercent}>{day.sunChance}%</Text>
              <Text style={styles.dayTemps}>
                <Text style={styles.dayTempMax}>{day.tempMax}°</Text> / {day.tempMin}°
              </Text>
              <Ionicons name="chevron-forward" size={16} color={light.colors.textMuted} />
            </TouchableOpacity>
          );
        })}
        <Text style={styles.source}>{t('forecast.source')}</Text>
      </ScrollView>
    </>
  );

  const renderDetail = (day: SunForecastDay) => {
    const { month, dayOfMonth, weekday } = parseDate(day.date);
    const dateLabel = `${t(`forecast.weekdaysFull.${WEEKDAY_KEYS[weekday]}`)} · ${String(dayOfMonth).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
    const rows: { key: string; icon: React.ReactNode; label: string; value: string }[] = [];

    if (day.sunshineHours !== null && day.daylightHours !== null) {
      rows.push({
        key: 'sun',
        icon: <Ionicons name="sunny" size={18} color={light.colors.accentDeep} />,
        label: t('forecast.detail.sunshine'),
        value: t('forecast.detail.sunshineValue', { sun: decimal(day.sunshineHours), day: decimal(day.daylightHours) }),
      });
    }
    rows.push({
      key: 'temp',
      icon: <Ionicons name="thermometer-outline" size={18} color={light.colors.tempHot} />,
      label: t('forecast.detail.temperature'),
      value: `${day.tempMax}° / ${day.tempMin}°`,
    });
    rows.push({
      key: 'rain',
      icon: <Ionicons name="rainy" size={18} color={light.colors.rain} />,
      label: t('forecast.detail.rain'),
      value: day.precipMm !== null && day.precipMm > 0 ? `${day.precipProbability}% · ${decimal(day.precipMm)} mm` : `${day.precipProbability}%`,
    });
    if (day.windMax !== null) {
      rows.push({
        key: 'wind',
        icon: <MaterialCommunityIcons name="weather-windy" size={18} color={light.colors.primary} />,
        label: t('forecast.detail.wind'),
        value: day.windGusts !== null ? `${day.windMax} km/h · ${t('forecast.detail.gusts')} ${day.windGusts} km/h` : `${day.windMax} km/h`,
      });
    }
    if (day.uvIndex !== null) {
      rows.push({
        key: 'uv',
        icon: <Ionicons name="shield" size={18} color={light.colors.warning} />,
        label: t('forecast.detail.uv'),
        value: `${day.uvIndex} · ${t(`forecast.detail.uvLevels.${uvLevelKey(day.uvIndex)}`)}`,
      });
    }
    if (day.sunrise && day.sunset) {
      rows.push({
        key: 'sunrise',
        icon: <MaterialCommunityIcons name="weather-sunset-up" size={18} color={light.colors.accentDeep} />,
        label: t('forecast.detail.sunriseSunset'),
        value: `${day.sunrise} / ${day.sunset}`,
      });
    }

    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={light.colors.primary} />
          </TouchableOpacity>
          <View style={styles.detailTitle}>
            <Text style={styles.title} numberOfLines={1}>{dateLabel}</Text>
            <WeatherIcon condition={day.condition} size={24} />
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={light.colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
          <DayRing sunChance={day.sunChance} label={t('forecast.detail.sunChance')} level={t(levelKey(day.sunChance))} />
          {rows.map((row, i) => (
            <InfoRow key={row.key} icon={row.icon} label={row.label} value={row.value} last={i === rows.length - 1} />
          ))}
        </ScrollView>
      </>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={selected ? () => setSelected(null) : onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, selected ? { maxHeight: height * 0.84 } : { height: height * 0.74 }]}>
          <View style={styles.handle} />
          {selected ? renderDetail(selected) : renderList()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 55, 0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFD',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md + 4,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 82, 212, 0.18)',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: light.colors.textPrimary,
    flexShrink: 1,
  },
  detailTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 82, 212, 0.12)',
  },
  // List rows: day 52 · icon 24 · bar (flex) · % 40 · temps 62 · chevron 16
  dayRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayLabel: {
    width: 52,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: light.colors.textPrimary,
  },
  dayLabelToday: {
    fontFamily: fonts.bold,
    color: light.colors.primary,
  },
  dayIcon: { width: 24, alignItems: 'center' },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: light.colors.primarySoft,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  dayPercent: {
    width: 40,
    textAlign: 'right',
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: light.colors.textPrimary,
  },
  dayTemps: {
    width: 62,
    textAlign: 'right',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: light.colors.textMuted,
  },
  dayTempMax: {
    fontFamily: fonts.bold,
    color: light.colors.textPrimary,
  },
  source: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: light.colors.textMuted,
    marginTop: spacing.md,
  },
  // Day detail
  detailScroll: { flexGrow: 0 },
  ring: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  ringValue: {
    fontFamily: fonts.extrabold,
    fontSize: 38,
    letterSpacing: -1,
    color: light.colors.textPrimary,
  },
  ringLabel: {
    maxWidth: RING_TEXT_WIDTH,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: light.colors.textSecondary,
  },
  ringLevel: {
    maxWidth: RING_TEXT_WIDTH,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: light.colors.textMuted,
  },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.xs,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: light.colors.textSecondary,
  },
  infoValue: {
    maxWidth: 176,
    textAlign: 'right',
    fontFamily: fonts.bold,
    fontSize: 14,
    color: light.colors.textPrimary,
  },
});
