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
} from 'react-native-svg';

interface HeroLogoProps {
  size?: number;
}

// Logo dimensions
const DEFAULT_SIZE = 120;
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 140;

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
    outputRange: [1, 1.03],
  });

  const aspectRatio = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
  const computedWidth = size * aspectRatio;
  const computedHeight = size;

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
            <RadialGradient id="sunGlow" cx="50%" cy="70%" rx="40%" ry="40%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
              <Stop offset="50%" stopColor="#FF8C00" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Large glow behind sun */}
          <Circle cx="100" cy="95" r="70" fill="url(#sunGlow)" />
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
            {/* Sun gradient - yellow to orange */}
            <LinearGradient id="sunGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFD700" />
              <Stop offset="100%" stopColor="#FF8C00" />
            </LinearGradient>

            {/* Inner glow for sun */}
            <RadialGradient id="sunInnerGlow" cx="50%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFEC8B" stopOpacity="1" />
              <Stop offset="60%" stopColor="#FFD700" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
            </RadialGradient>

            {/* Soft edge glow */}
            <RadialGradient id="sunEdgeGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="70%" stopColor="#FFD700" stopOpacity="0" />
              <Stop offset="85%" stopColor="#FFD700" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <G>
            {/* Sun - positioned to appear behind mountains */}
            {/* Outer glow ring */}
            <Circle cx="100" cy="95" r="48" fill="url(#sunEdgeGlow)" />
            {/* Main sun circle */}
            <Circle cx="100" cy="95" r="40" fill="url(#sunInnerGlow)" />

            {/* Mountain silhouette - white line contours */}
            {/* Back mountains (lower, distant range) */}
            <Path
              d="M 0 122
                 L 14 108
                 L 24 114
                 L 38 102
                 L 48 108"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <Path
              d="M 118 108
                 L 132 98
                 L 142 104
                 L 155 94
                 L 168 100
                 L 178 106
                 L 188 98
                 L 200 112"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main mountain range with Teide volcano offset to left */}
            <Path
              d="M 0 140
                 L 10 130
                 L 22 134
                 L 32 122
                 L 42 126
                 L 52 112
                 L 58 116
                 L 65 98
                 L 72 82
                 L 78 72
                 L 92 72
                 L 98 82
                 L 105 98
                 L 112 108
                 L 122 102
                 L 135 112
                 L 148 106
                 L 158 114
                 L 172 108
                 L 182 118
                 L 192 126
                 L 200 140"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Teide flat crater top - wider caldera */}
            <Path
              d="M 78 72 L 92 72"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
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
