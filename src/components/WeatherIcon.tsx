import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WeatherCondition } from '../types';

// ─── WEATHER ICON MAPPING ────────────────────────────────────────────────────
// Maps weather conditions to Ionicons names and their glow colors

interface WeatherIconConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string; // Icon fill colour (visible on the light theme background)
  glowColor: string;
  isComposite?: boolean; // For multi-layer icons like partly-sunny
}

// Sun color constant - warm yellow (glow)
const SUN_COLOR = '#FFCC00';
// Moon color constant - light blue glow for night icons
const MOON_COLOR = '#7DD3FC';

// ─── LIGHT-THEME FILL COLOURS ────────────────────────────────────────────────
// Icons sit on a soft light-blue background, so fills must be saturated/dark
// enough to stay visible (white/silver from the old dark theme disappeared).
const SUN_FILL = '#F59E0B';   // amber (matches the Stitch design sun)
const MOON_FILL = '#38BDF8';  // light sky blue for night icons (moon / moon+cloud)
const CLOUD_FILL = '#6B7280'; // slate grey for clouds/fog

const WEATHER_ICON_MAP: Record<WeatherCondition, WeatherIconConfig> = {
  sunny: {
    icon: 'sunny',
    color: SUN_FILL,
    glowColor: SUN_COLOR, // Warm yellow glow for sunny
  },
  'partly-sunny': {
    icon: 'partly-sunny', // Not used directly - we render composite
    color: SUN_FILL,
    glowColor: SUN_COLOR,
    isComposite: true,
  },
  cloudy: {
    icon: 'cloud',
    color: CLOUD_FILL,
    glowColor: '#A0AEC0', // Gray-blue glow for cloudy
  },
  rainy: {
    icon: 'rainy-outline',
    color: '#1385FF',
    glowColor: '#4DABF7', // Blue glow for rainy
  },
  stormy: {
    icon: 'thunderstorm',
    color: '#7C3AED',
    glowColor: '#7C3AED', // Purple glow for stormy
  },
  snowy: {
    icon: 'snow',
    color: '#38BDF8',
    glowColor: '#E0F2FE', // Light blue-white glow for snow
  },
  foggy: {
    icon: 'cloud',
    color: '#94A3B8',
    glowColor: '#94A3B8', // Muted gray glow for fog
  },
  windy: {
    icon: 'leaf', // Wind blowing leaves
    color: '#3B82F6',
    glowColor: '#60A5FA', // Light blue glow for windy
  },
  'muddy-rain': {
    icon: 'rainy', // Rain icon but with different glow
    color: '#D97706',
    glowColor: '#D97706', // Orange-brown glow for muddy rain (Calima)
  },
  'clear-night': {
    icon: 'moon',
    color: MOON_FILL,
    glowColor: MOON_COLOR, // Soft silver glow for clear night
  },
  'partly-cloudy-night': {
    icon: 'cloudy-night',
    color: MOON_FILL,
    glowColor: MOON_COLOR,
  },
};

// ─── COMPONENT PROPS ─────────────────────────────────────────────────────────

interface WeatherIconProps {
  /** Weather condition to display */
  condition: WeatherCondition;
  /** Icon size - 'large' for main display (54), 'small' for parameters (16) */
  size?: 'large' | 'small' | number;
  /** Whether to show the glow effect */
  showGlow?: boolean;
  /** Optional style override */
  style?: ViewStyle;
}

// ─── SIZE PRESETS ────────────────────────────────────────────────────────────

const SIZE_PRESETS = {
  large: 54,
  small: 16,
} as const;

// ─── PARTLY SUNNY COMPOSITE ICON ─────────────────────────────────────────────
// Custom two-layer icon: sun peeking from behind cloud

interface PartlySunnyIconProps {
  size: number;
  isSmall: boolean;
  showGlow: boolean;
}

function PartlySunnyIcon({ size, isSmall, showGlow }: PartlySunnyIconProps) {
  // Calculate relative sizes
  const sunSize = size * 0.7;
  const cloudSize = size * 0.85;

  // Sun offset (upper-right, peeking from behind cloud)
  const sunOffsetX = size * 0.25;
  const sunOffsetY = -size * 0.2;

  // Cloud offset (lower-left, in front)
  const cloudOffsetX = -size * 0.1;
  const cloudOffsetY = size * 0.15;

  // Glow intensities
  const sunGlowRadius = isSmall ? 8 : 15;
  const cloudGlowRadius = isSmall ? 4 : 8;
  const sunGlowOpacity = showGlow ? (isSmall ? 0.6 : 0.8) : 0;
  const cloudGlowOpacity = showGlow ? (isSmall ? 0.4 : 0.6) : 0;

  return (
    <View style={[styles.compositeContainer, { width: size, height: size }]}>
      {/* Background: Sun with warm yellow glow */}
      <View
        style={[
          styles.compositeLayer,
          {
            transform: [{ translateX: sunOffsetX }, { translateY: sunOffsetY }],
            shadowColor: SUN_COLOR,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: sunGlowOpacity,
            shadowRadius: sunGlowRadius,
            elevation: isSmall ? 4 : 8,
          },
        ]}
      >
        <Ionicons
          name="sunny"
          size={sunSize}
          color={SUN_FILL}
          style={{
            textShadowColor: SUN_COLOR,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: sunGlowRadius,
          }}
        />
      </View>

      {/* Foreground: Cloud with white glow */}
      <View
        style={[
          styles.compositeLayer,
          {
            transform: [{ translateX: cloudOffsetX }, { translateY: cloudOffsetY }],
            shadowColor: '#FFFFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: cloudGlowOpacity,
            shadowRadius: cloudGlowRadius,
            elevation: isSmall ? 6 : 10,
          },
        ]}
      >
        <Ionicons
          name="cloud"
          size={cloudSize}
          color={CLOUD_FILL}
          style={{
            textShadowColor: '#FFFFFF',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: cloudGlowRadius,
          }}
        />
      </View>
    </View>
  );
}

// ─── WEATHER ICON COMPONENT ──────────────────────────────────────────────────

export const WeatherIcon = React.memo(function WeatherIcon({
  condition,
  size = 'large',
  showGlow = true,
  style,
}: WeatherIconProps) {
  const config = WEATHER_ICON_MAP[condition];
  const iconSize = typeof size === 'number' ? size : SIZE_PRESETS[size];
  const isSmall = size === 'small' || (typeof size === 'number' && size <= 24);

  // Render composite partly-sunny icon
  if (condition === 'partly-sunny') {
    return (
      <View style={[styles.container, style]}>
        <PartlySunnyIcon size={iconSize} isSmall={isSmall} showGlow={showGlow} />
      </View>
    );
  }

  // Glow styles based on size
  const glowStyle = showGlow
    ? {
        shadowColor: config.glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isSmall ? 0.6 : 0.8,
        shadowRadius: isSmall ? 6 : 10,
        elevation: isSmall ? 4 : 8,
      }
    : {};

  // Icon opacity - lower for small parameter icons
  const iconOpacity = isSmall ? 0.6 : 1;

  // Light-theme fill colour per condition (visible on the soft blue background)
  const iconColor = config.color;

  return (
    <View style={[styles.container, glowStyle, style]}>
      <Ionicons
        name={config.icon}
        size={iconSize}
        color={iconColor}
        style={{ opacity: iconOpacity }}
      />
    </View>
  );
});

// ─── PARAMETER ICON COMPONENT ────────────────────────────────────────────────
// Smaller icons for wind, humidity etc. with subtle glow

interface ParameterIconProps {
  /** Ionicons icon name */
  name: keyof typeof Ionicons.glyphMap;
  /** Icon size (default: 16) */
  size?: number;
  /** Glow color (default: white) */
  glowColor?: string;
  /** Optional style override */
  style?: ViewStyle;
}

export function ParameterIcon({
  name,
  size = 16,
  glowColor = '#FFFFFF',
  style,
}: ParameterIconProps) {
  return (
    <View
      style={[
        styles.parameterContainer,
        {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      <Ionicons
        name={name}
        size={size}
        color="#FFFFFF"
        style={{ opacity: 0.6 }}
      />
    </View>
  );
}

// ─── HELPER FUNCTION ─────────────────────────────────────────────────────────
// Get the glow color for a weather condition

export function getWeatherGlowColor(condition: WeatherCondition): string {
  return WEATHER_ICON_MAP[condition].glowColor;
}

// Get the icon name for a weather condition
export function getWeatherIconName(condition: WeatherCondition): keyof typeof Ionicons.glyphMap {
  return WEATHER_ICON_MAP[condition].icon;
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  parameterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Composite icon container (for partly-sunny)
  compositeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compositeLayer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
