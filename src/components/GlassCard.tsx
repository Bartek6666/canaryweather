import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { shadows, colors, light } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur intensity (default: 30) */
  intensity?: number;
  /** Card variant - all now use consistent borderRadius: 24 */
  variant?: 'default' | 'elevated' | 'subtle';
  /** Color scheme - 'dark' (legacy) or 'light' (Sunly redesign) */
  scheme?: 'dark' | 'light';
  /** Animation delay in ms for staggered effect */
  delay?: number;
  /** Disable entrance animation */
  noAnimation?: boolean;
}

// Consistent design tokens for all glass cards
const GLASS_BORDER_RADIUS = 24;
const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
const GLASS_OVERLAY_COLOR = 'rgba(255, 255, 255, 0.1)';
const GLASS_OVERLAY_SUBTLE = 'rgba(255, 255, 255, 0.06)';
// Light scheme (redesign) - stronger white frosted panels on bright backgrounds
const GLASS_LIGHT_BORDER_COLOR = light.colors.border;
const GLASS_LIGHT_OVERLAY = 'rgba(255, 255, 255, 0.55)';
const GLASS_LIGHT_OVERLAY_SUBTLE = 'rgba(255, 255, 255, 0.4)';

export function GlassCard({
  children,
  style,
  intensity = 30,
  variant = 'default',
  scheme = 'dark',
  delay = 0,
  noAnimation = false,
}: GlassCardProps) {
  const fadeAnim = useRef(new Animated.Value(noAnimation ? 1 : 0)).current;
  const translateAnim = useRef(new Animated.Value(noAnimation ? 0 : 16)).current;

  const isLight = scheme === 'light';
  // Variant-specific overlay opacity
  const overlayColor = isLight
    ? (variant === 'subtle' ? GLASS_LIGHT_OVERLAY_SUBTLE : GLASS_LIGHT_OVERLAY)
    : (variant === 'subtle' ? GLASS_OVERLAY_SUBTLE : GLASS_OVERLAY_COLOR);
  const borderColor = isLight ? GLASS_LIGHT_BORDER_COLOR : GLASS_BORDER_COLOR;
  const cardShadow = isLight ? light.cardShadow : shadows.glass;

  useEffect(() => {
    if (!noAnimation) {
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [noAnimation, delay, fadeAnim, translateAnim]);

  const content = (
    <View style={[
      styles.container,
      { borderColor },
      cardShadow,
      style,
    ]}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={[StyleSheet.absoluteFill, styles.blur]}
      />
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (noAnimation) {
    return content;
  }

  // Extract flex from style for the outer Animated.View
  const flatStyle = StyleSheet.flatten(style) || {};
  const outerStyle = {
    flex: flatStyle.flex,
    flexGrow: flatStyle.flexGrow,
    flexShrink: flatStyle.flexShrink,
    width: flatStyle.width,
    height: flatStyle.height,
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        },
        outerStyle,
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    borderRadius: GLASS_BORDER_RADIUS,
  },
  blur: {
    borderRadius: GLASS_BORDER_RADIUS,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: GLASS_BORDER_RADIUS,
  },
  content: {
    flex: 1,
  },
});
