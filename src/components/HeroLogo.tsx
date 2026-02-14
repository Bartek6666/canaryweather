import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  Circle,
  Path,
  G,
  Line,
} from 'react-native-svg';

interface HeroLogoProps {
  size?: number;
}

// Logo dimensions
const DEFAULT_SIZE = 120;
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 140;

// Colors matching the brand
const VOLCANO_FILL = '#1e3148';
const VOLCANO_STROKE = '#ffffff';
const SUN_COLOR = '#F5B800';
const SUN_COLOR_DARK = '#E5A000';

export function HeroLogo({ size = DEFAULT_SIZE }: HeroLogoProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.9],
  });

  const sunScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const aspectRatio = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
  const computedWidth = size * aspectRatio;
  const computedHeight = size;

  // Sun rays configuration
  const sunCenterX = 100;
  const sunCenterY = 70;
  const sunRadius = 32;
  const rayCount = 14;
  const rayInnerRadius = sunRadius + 4;
  const rayOuterRadius = sunRadius + 22;

  // Generate sun rays
  const rays = [];
  for (let i = 0; i < rayCount; i++) {
    const angle = (i * 360) / rayCount - 90; // Start from top
    const radians = (angle * Math.PI) / 180;
    const x1 = sunCenterX + rayInnerRadius * Math.cos(radians);
    const y1 = sunCenterY + rayInnerRadius * Math.sin(radians);
    const x2 = sunCenterX + rayOuterRadius * Math.cos(radians);
    const y2 = sunCenterY + rayOuterRadius * Math.sin(radians);
    rays.push({ x1, y1, x2, y2, key: i });
  }

  return (
    <View style={[styles.container, { width: computedWidth, height: computedHeight }]}>
      {/* Glow layer - animated */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      >
        <Svg
          width={computedWidth}
          height={computedHeight}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          <Defs>
            <RadialGradient id="sunGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={SUN_COLOR} stopOpacity="0.6" />
              <Stop offset="40%" stopColor={SUN_COLOR} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={SUN_COLOR} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Large glow behind sun */}
          <Circle cx={sunCenterX} cy={sunCenterY} r="65" fill="url(#sunGlow)" />
        </Svg>
      </Animated.View>

      {/* Main SVG layer */}
      <Animated.View style={[styles.mainLayer, { transform: [{ scale: sunScale }] }]}>
        <Svg
          width={computedWidth}
          height={computedHeight}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          <Defs>
            {/* Sun gradient */}
            <LinearGradient id="sunGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={SUN_COLOR} />
              <Stop offset="100%" stopColor={SUN_COLOR_DARK} />
            </LinearGradient>

            {/* Ray gradient for fading effect */}
            <LinearGradient id="rayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={SUN_COLOR} stopOpacity="1" />
              <Stop offset="100%" stopColor={SUN_COLOR} stopOpacity="0.4" />
            </LinearGradient>
          </Defs>

          <G>
            {/* Sun rays */}
            {rays.map((ray) => (
              <Line
                key={ray.key}
                x1={ray.x1}
                y1={ray.y1}
                x2={ray.x2}
                y2={ray.y2}
                stroke={SUN_COLOR}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity={0.9}
              />
            ))}

            {/* Main sun circle */}
            <Circle
              cx={sunCenterX}
              cy={sunCenterY}
              r={sunRadius}
              fill="url(#sunGradient)"
            />

            {/* Volcano shape - filled with dark color and white stroke */}
            {/* Main volcano (Teide) with crater */}
            <Path
              d="M 20 140
                 L 45 115
                 L 55 118
                 L 68 100
                 L 78 88
                 L 88 78
                 L 92 78
                 L 96 78
                 L 100 78
                 L 104 88
                 L 115 100
                 L 125 110
                 L 135 105
                 L 148 112
                 L 160 108
                 L 175 118
                 L 185 125
                 L 200 140
                 Z"
              fill={VOLCANO_FILL}
            />

            {/* Volcano white outline */}
            <Path
              d="M 20 140
                 L 45 115
                 L 55 118
                 L 68 100
                 L 78 88
                 L 88 78
                 L 92 78
                 L 96 78
                 L 100 78
                 L 104 88
                 L 115 100
                 L 125 110
                 L 135 105
                 L 148 112
                 L 160 108
                 L 175 118
                 L 185 125"
              fill="none"
              stroke={VOLCANO_STROKE}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Crater detail */}
            <Path
              d="M 88 78 Q 94 82 100 78"
              fill="none"
              stroke={VOLCANO_STROKE}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mainLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default HeroLogo;
