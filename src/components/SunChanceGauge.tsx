import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { typography, spacing, light, fonts } from '../constants/theme';
import { GlassCard } from './GlassCard';

interface SunChanceGaugeProps {
  percentage: number;
  confidence: 'high' | 'medium' | 'low';
  isLoading?: boolean;
  onInfoPress?: () => void;
  selectedMonth?: number;
}

// Gauge dimensions
const RADIUS = 120;
const STROKE_WIDTH = 20;
const SIZE = (RADIUS + STROKE_WIDTH) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIMATION_DURATION = 1500;

// Number of segments for gradient effect
const NUM_SEGMENTS = 50;

// Interpolate color based on position (0-1)
const interpolateColor = (t: number): string => {
  // Color stops (position 0-1) — muted amber palette (minimalist)
  const stops = [
    { pos: 0, r: 253, g: 230, b: 138 },   // #FDE68A - soft amber
    { pos: 0.5, r: 251, g: 191, b: 36 },  // #FBBF24 - amber
    { pos: 1, r: 245, g: 158, b: 11 },    // #F59E0B - deep amber
  ];

  const v = Math.max(0, Math.min(1, t));

  let lower = stops[0];
  let upper = stops[1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i].pos && v <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.pos - lower.pos;
  const factor = range === 0 ? 0 : (v - lower.pos) / range;

  const r = Math.round(lower.r + (upper.r - lower.r) * factor);
  const g = Math.round(lower.g + (upper.g - lower.g) * factor);
  const b = Math.round(lower.b + (upper.b - lower.b) * factor);

  return `rgb(${r}, ${g}, ${b})`;
};

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export function SunChanceGauge({ percentage, confidence, isLoading = false, onInfoPress, selectedMonth }: SunChanceGaugeProps) {
  const { t } = useTranslation();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const confidenceLabels = {
    high: t('result.sunChanceLevelHigh'),
    medium: t('result.sunChanceLevelMedium'),
    low: t('result.sunChanceLevelLow'),
  };

  // Get month-specific translation key (e.g., "sunChanceInJanuary")
  const monthKey = selectedMonth ? MONTH_KEYS[selectedMonth - 1] : MONTH_KEYS[new Date().getMonth()];
  const capitalizedMonthKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
  const sunChanceMonthKey = `result.sunChanceIn${capitalizedMonthKey}`;

  // Use month-specific key if available (for Polish grammar), fallback to generic
  const sunChanceLabel = t(sunChanceMonthKey, { defaultValue: '' }) || t('result.sunChanceIn', { month: t(`months.${monthKey}`) });

  useEffect(() => {
    if (!isLoading) {
      progressAnim.setValue(0);
      setDisplayedPercentage(0);
      setAnimatedProgress(0);

      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }).start();

      const listener = progressAnim.addListener(({ value }) => {
        setDisplayedPercentage(Math.round(value));
        setAnimatedProgress(value);
      });

      return () => progressAnim.removeListener(listener);
    } else {
      progressAnim.setValue(0);
      setDisplayedPercentage(0);
      setAnimatedProgress(0);
    }
  }, [percentage, isLoading]);

  const getPercentageColor = (_value: number): string => light.colors.textPrimary;

  // Generate gradient segments
  const renderGradientArc = () => {
    if (animatedProgress <= 0) return null;

    const segments = [];
    const totalProgress = animatedProgress / 100;
    const segmentAngle = 360 / NUM_SEGMENTS;
    const segmentLength = CIRCUMFERENCE / NUM_SEGMENTS;
    const activeSegments = Math.ceil(totalProgress * NUM_SEGMENTS);

    for (let i = 0; i < activeSegments; i++) {
      const segmentProgress = i / NUM_SEGMENTS;
      const isLastSegment = i === activeSegments - 1;

      // For last segment, calculate partial length
      let thisSegmentLength = segmentLength;
      if (isLastSegment) {
        const remainingProgress = (totalProgress * NUM_SEGMENTS) - i;
        thisSegmentLength = segmentLength * remainingProgress;
      }

      // Color based on position along the arc (0 = start, 1 = current end)
      const colorPosition = segmentProgress / totalProgress;
      const color = interpolateColor(colorPosition);

      // Rotation for this segment (start from top, -90deg)
      const rotation = -90 + (i * segmentAngle);

      segments.push(
        <Circle
          key={i}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap={i === 0 ? "round" : "butt"}
          strokeDasharray={`${thisSegmentLength} ${CIRCUMFERENCE}`}
          rotation={rotation}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      );
    }

    // Add rounded end cap at the current position
    if (activeSegments > 0) {
      const endAngle = -90 + (totalProgress * 360);
      const endColor = interpolateColor(1);
      const endX = SIZE / 2 + RADIUS * Math.cos((endAngle * Math.PI) / 180);
      const endY = SIZE / 2 + RADIUS * Math.sin((endAngle * Math.PI) / 180);

      segments.push(
        <Circle
          key="end-cap"
          cx={endX}
          cy={endY}
          r={STROKE_WIDTH / 2}
          fill={endColor}
        />
      );
    }

    return segments;
  };

  // Render glow effect
  const renderGlow = () => {
    if (animatedProgress <= 0) return null;

    const totalProgress = animatedProgress / 100;
    const dashLength = totalProgress * CIRCUMFERENCE;
    const glowColor = interpolateColor(0.5); // Middle color for glow

    return (
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={glowColor}
        strokeWidth={STROKE_WIDTH + 20}
        strokeLinecap="round"
        strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
        rotation={-90}
        origin={`${SIZE / 2}, ${SIZE / 2}`}
        opacity={0.12}
      />
    );
  };

  if (isLoading) {
    return (
      <GlassCard scheme="light" style={styles.container}>
        <View style={styles.gaugeWrapper}>
          <View style={styles.loadingContainer}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(0, 0, 0, 0.06)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.centerContent}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard scheme="light" style={styles.container}>
      {/* Info button - top right corner */}
      {onInfoPress && (
        <TouchableOpacity
          style={styles.infoButton}
          onPress={onInfoPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="information-circle"
            size={28}
            color={light.colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      <View style={styles.gaugeWrapper}>
        <View style={styles.svgContainer}>
          <Svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={styles.svg}
          >
            {/* Background track */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(0, 0, 0, 0.06)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />

            {/* Glow effect */}
            {renderGlow()}

            {/* Gradient arc segments */}
            <G>{renderGradientArc()}</G>
          </Svg>

          <View style={styles.centerContent}>
            <Text style={[styles.percentageText, { color: getPercentageColor(percentage) }]}>
              {displayedPercentage}%
            </Text>
            <Text style={styles.label}>{sunChanceLabel}</Text>
            <Text style={styles.confidence}>{confidenceLabels[confidence]}</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  gaugeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  svgContainer: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 56,
    fontFamily: fonts.extrabold,
    letterSpacing: -2,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: light.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: 160,
    marginTop: spacing.xs,
  },
  confidence: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: light.colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: light.colors.textSecondary,
  },
});
