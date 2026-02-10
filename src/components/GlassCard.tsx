import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { shadows, colors } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur intensity (default: 30) */
  intensity?: number;
  /** Card variant - all now use consistent borderRadius: 24 */
  variant?: 'default' | 'elevated' | 'subtle';
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

export function GlassCard({
  children,
  style,
  intensity = 30,
  variant = 'default',
  delay = 0,
  noAnimation = false,
}: GlassCardProps) {
  const fadeAnim = useRef(new Animated.Value(noAnimation ? 1 : 0)).current;
  const translateAnim = useRef(new Animated.Value(noAnimation ? 0 : 16)).current;

  // Variant-specific overlay opacity
  const overlayColor = variant === 'subtle' ? GLASS_OVERLAY_SUBTLE : GLASS_OVERLAY_COLOR;

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
      shadows.glass,
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

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
      }}
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

export default GlassCard;
