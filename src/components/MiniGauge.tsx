import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts, light } from '../constants/theme';

interface MiniGaugeProps {
  /** Fill fraction 0..1 */
  fraction: number;
  /** Big centre value, e.g. "18" or "35" */
  value: string;
  /** Small unit under the value, e.g. "km/h" or "%" */
  unit?: string;
  /** Ring + value colour */
  color: string;
  size?: number;
}

const STROKE = 6;

/**
 * Small circular progress ring with a value in the middle. A compact version of
 * the hero gauges on the Wind/Rain detail screens, used on the result-screen tiles.
 */
export function MiniGauge({ fraction, value, unit, color, size = 68 }: MiniGaugeProps) {
  const r = (size - STROKE) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(fraction, 1));
  const offset = circ * (1 - clamped);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(0, 0, 0, 0.06)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  value: { fontSize: 18, fontFamily: fonts.bold, lineHeight: 20 },
  unit: { fontSize: 10, fontFamily: fonts.medium, color: light.colors.textMuted },
});
