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
  /** Ring thickness. Defaults to ~9% of size so bigger gauges get a proportionally thicker ring. */
  stroke?: number;
}

/**
 * Small circular progress ring with a value in the middle. A compact version of
 * the hero gauges on the Wind/Rain detail screens, used on the result-screen tiles.
 * Stroke and typography scale with `size` so the ring stays balanced when enlarged.
 */
export function MiniGauge({ fraction, value, unit, color, size = 68, stroke }: MiniGaugeProps) {
  const strokeWidth = stroke ?? Math.round(size * 0.09);
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(fraction, 1));
  const offset = circ * (1 - clamped);

  const valueFontSize = Math.round(size * 0.28);
  const unitFontSize = Math.round(size * 0.135);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(0, 0, 0, 0.06)" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={[styles.value, { color, fontSize: valueFontSize, lineHeight: valueFontSize + 2 }]}>{value}</Text>
      {unit ? <Text style={[styles.unit, { fontSize: unitFontSize }]}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  value: { fontFamily: fonts.bold },
  unit: { fontFamily: fonts.medium, color: light.colors.textMuted },
});
