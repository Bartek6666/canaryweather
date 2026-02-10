import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { colors, typography, spacing, glassText } from '../constants/theme';
import { GlassCard } from './GlassCard';

interface SunChanceGaugeProps {
  percentage: number;
  confidence: 'high' | 'medium' | 'low';
  isLoading?: boolean;
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
  // Color stops (position 0-1)
  const stops = [
    { pos: 0, r: 255, g: 253, b: 231 },     // #FFFDE7 - almost white
    { pos: 0.25, r: 255, g: 245, b: 157 },  // #FFF59D - light yellow
    { pos: 0.5, r: 255, g: 204, b: 0 },     // #FFCC00 - warm yellow
    { pos: 0.75, r: 255, g: 152, b: 0 },    // #FF9800 - orange
    { pos: 1, r: 255, g: 109, b: 0 },       // #FF6D00 - deep orange
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

export function SunChanceGauge({ percentage, confidence, isLoading = false }: SunChanceGaugeProps) {
  const { t } = useTranslation();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const confidenceLabels = {
    high: t('result.confidenceHigh'),
    medium: t('result.confidenceMedium'),
    low: t('result.confidenceLow'),
  };

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

  const getPercentageColor = (value: number): string => {
    if (value >= 70) return colors.sunChanceHigh;
    if (value >= 40) return colors.sunChanceMedium;
    return colors.sunChanceLow;
  };

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
        opacity={0.3}
      />
    );
  };

  if (isLoading) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.gaugeWrapper}>
          <View style={styles.loadingContainer}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
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
    <GlassCard style={styles.container}>
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
              stroke="rgba(255, 255, 255, 0.15)"
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
            <Text style={styles.label}>{t('result.sunChance')}</Text>
            <Text style={styles.confidence}>{confidenceLabels[confidence]}</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
    width: SIZE + spacing.xl * 2,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700',
    letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: glassText.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  confidence: {
    fontSize: 12,
    fontWeight: '500',
    color: glassText.muted,
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
    color: glassText.secondary,
  },
});

export default SunChanceGauge;
