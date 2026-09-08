import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  Rect,
  Circle,
  Ellipse,
  Path,
} from 'react-native-svg';

import { light } from '../constants/theme';

interface SunlyIconProps {
  size?: number;
  // Cleaner variant for small sizes (e.g. the app-bar brand at ~32px): drops the
  // faint back wave, sun highlight and 1px crest stroke that muddy into a smudge
  // when shrunk. Use the full detailed version for large renders (onboarding).
  simple?: boolean;
}

/**
 * Sunly brand icon — stylized sun over waves on a royal-blue rounded square
 * (tile uses the app's primary token for brand cohesion). viewBox is 100×100.
 */
export function SunlyIcon({ size = 120, simple = false }: SunlyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity={1} />
          <Stop offset="100%" stopColor="#FF8C00" stopOpacity={1} />
        </LinearGradient>
        <RadialGradient id="skyGrad" cx="50%" cy="40%" r="70%">
          {/* Royal-blue tile — same token as the app's primary buttons, so the brand
              icon stays consistent with the app's blue. Amber sun + white waves pop. */}
          <Stop offset="0%" stopColor={light.colors.primary} stopOpacity={1} />
          <Stop offset="100%" stopColor={light.colors.primaryDark} stopOpacity={1} />
        </RadialGradient>
        <ClipPath id="tile">
          <Rect width={100} height={100} rx={22} />
        </ClipPath>
      </Defs>

      {/* Background */}
      <Rect width={100} height={100} rx={22} fill="url(#skyGrad)" />

      {/* Stylized sun (larger, higher in simple mode so it reads at small sizes) */}
      <Circle cx={50} cy={simple ? 40 : 43} r={simple ? 24 : 21} fill="url(#sunGrad)" />
      {!simple && (
        <Ellipse
          cx={44}
          cy={37}
          rx={5}
          ry={3.5}
          fill="#FFF9C4"
          opacity={0.45}
          transform="rotate(-20 44 37)"
        />
      )}

      {/* Back wave for depth (skipped in simple mode) */}
      {!simple && (
        <Path
          clipPath="url(#tile)"
          d="M0 80 C 15 78, 20 72, 25 72 L 28 78 C 40 76, 45 70, 50 70 L 53 78 C 65 76, 70 70, 75 70 L 78 78 C 90 76, 95 72, 100 72 L 100 100 L 0 100 Z"
          fill="#FFFFFF"
          opacity={0.28}
        />
      )}

      {/* Front wave — one smooth bold crest in simple mode, layered notches otherwise */}
      <Path
        clipPath="url(#tile)"
        d={
          simple
            ? 'M0 84 C 18 82, 22 74, 30 74 C 38 74, 42 82, 50 82 C 58 82, 62 74, 70 74 C 78 74, 82 82, 100 84 L 100 100 L 0 100 Z'
            : 'M0 90 C 15 88, 20 82, 25 82 L 28 88 C 40 86, 45 80, 50 80 L 53 88 C 65 86, 70 80, 75 80 L 78 88 C 90 86, 95 82, 100 82 L 100 100 L 0 100 Z'
        }
        fill="#FFFFFF"
      />

      {/* Front wave crest highlight (skipped in simple mode) */}
      {!simple && (
        <Path
          clipPath="url(#tile)"
          d="M0 90 C 15 88, 20 82, 25 82 L 28 88 C 40 86, 45 80, 50 80 L 53 88 C 65 86, 70 80, 75 80 L 78 88 C 90 86, 95 82, 100 82"
          fill="none"
          stroke="#A8D8F0"
          strokeWidth={1}
          opacity={0.6}
        />
      )}
    </Svg>
  );
}
