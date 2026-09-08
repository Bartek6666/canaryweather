import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { spacing, borderRadius, fonts, light } from '../constants/theme';
import { getYearlyMonthlyTemperatures, MonthlyTemperature } from '../services/weatherService';

const { width } = Dimensions.get('window');
const PLOT_HEIGHT = 170;

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

interface YearTemperatureChartModalProps {
  visible: boolean;
  year: number | null;
  stationId: string;
  onClose: () => void;
}

export function YearTemperatureChartModal({
  visible,
  year,
  stationId,
  onClose,
}: YearTemperatureChartModalProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<MonthlyTemperature[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && year !== null) {
      let cancelled = false;
      setLoading(true);
      setData(null);
      getYearlyMonthlyTemperatures(stationId, year)
        .then((res) => { if (!cancelled) setData(res); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, [visible, year, stationId]);

  // Build a temperature scale from the months that actually have data
  const withData = (data ?? []).filter((m) => m.avgTmax !== null && m.avgTmin !== null);
  const hasAny = withData.length > 0;

  let minT = 0;
  let maxT = 1;
  if (hasAny) {
    minT = Math.floor(Math.min(...withData.map((m) => m.avgTmin as number)) - 2);
    maxT = Math.ceil(Math.max(...withData.map((m) => m.avgTmax as number)) + 2);
  }
  const range = Math.max(1, maxT - minT);
  const midT = Math.round((maxT + minT) / 2);
  // y = pixels from the top of the plot for a given temperature
  const yFor = (temp: number) => PLOT_HEIGHT - ((temp - minT) / range) * PLOT_HEIGHT;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <BlurView intensity={40} tint="light" style={[StyleSheet.absoluteFill, styles.blur]} />
              <View style={styles.glassOverlay} />

              <View style={styles.content}>
                <Text style={styles.title}>{year}</Text>
                <Text style={styles.subtitle}>{t('result.yearChartSubtitle')}</Text>

                {loading ? (
                  <View style={styles.center}>
                    <ActivityIndicator color={light.colors.primary} />
                  </View>
                ) : !hasAny ? (
                  <View style={styles.center}>
                    <Text style={styles.noData}>{t('result.yearChartNoData')}</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.chartRow}>
                      {/* Y axis */}
                      <View style={styles.yAxis}>
                        <Text style={styles.axisLabel}>{maxT}°</Text>
                        <Text style={styles.axisLabel}>{midT}°</Text>
                        <Text style={styles.axisLabel}>{minT}°</Text>
                      </View>

                      {/* Plot + month labels */}
                      <View style={styles.plotWrapper}>
                        <View style={styles.plotArea}>
                          <View style={[styles.gridline, { top: 0 }]} />
                          <View style={[styles.gridline, { top: PLOT_HEIGHT / 2 }]} />
                          <View style={[styles.gridline, { top: PLOT_HEIGHT }]} />

                          <View style={styles.barsRow}>
                            {(data ?? []).map((m) => {
                              const has = m.avgTmax !== null && m.avgTmin !== null;
                              const top = has ? yFor(m.avgTmax as number) : 0;
                              const barHeight = has
                                ? Math.max(4, yFor(m.avgTmin as number) - yFor(m.avgTmax as number))
                                : 0;
                              return (
                                <View key={m.month} style={styles.barCol}>
                                  {has && (
                                    <LinearGradient
                                      colors={[light.colors.tempHot, light.colors.tempCold]}
                                      style={[styles.bar, { marginTop: top, height: barHeight }]}
                                    />
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        <View style={styles.labelsRow}>
                          {MONTH_KEYS.map((key) => (
                            <Text key={key} style={styles.monthLabel} numberOfLines={1}>
                              {t(`monthsShort.${key}`)}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendSwatch, { backgroundColor: light.colors.tempHot }]} />
                        <Text style={styles.legendText}>{t('result.avgMax')}</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendSwatch, { backgroundColor: light.colors.tempCold }]} />
                        <Text style={styles.legendText}>{t('result.avgMin')}</Text>
                      </View>
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.closeButtonText}>{t('result.close')}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    width: width - spacing.md * 2,
    maxWidth: 440,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: light.colors.border,
    overflow: 'hidden',
    ...light.cardShadow,
  },
  blur: {
    borderRadius: borderRadius.xxl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: borderRadius.xxl,
  },
  content: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    color: light.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: light.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  center: {
    height: PLOT_HEIGHT + 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noData: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: light.colors.textMuted,
    textAlign: 'center',
  },
  chartRow: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 26,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: spacing.xs,
  },
  axisLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: light.colors.textMuted,
  },
  plotWrapper: {
    flex: 1,
  },
  plotArea: {
    height: PLOT_HEIGHT,
    position: 'relative',
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  barsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  barCol: {
    flex: 1,
    height: PLOT_HEIGHT,
    alignItems: 'center',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  monthLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9,
    color: light.colors.textMuted,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: light.colors.textSecondary,
  },
  closeButton: {
    backgroundColor: light.colors.primary,
    paddingVertical: spacing.sm + 3,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  closeButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
