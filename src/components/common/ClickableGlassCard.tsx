import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Animated, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { shadows } from '../../constants/theme';

interface ClickableGlassCardProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Animation delay in ms for staggered entrance effect */
  delay?: number;
}

// Design tokens
const GLASS_BORDER_RADIUS = 24;
const GLASS_BORDER_COLOR = 'rgba(255, 193, 7, 0.3)'; // Amber - suggests clickability
const GLASS_OVERLAY_COLOR = 'rgba(255, 255, 255, 0.1)';

export function ClickableGlassCard({
  children,
  onPress,
  style,
  delay = 0,
}: ClickableGlassCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
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
  }, [delay, fadeAnim, translateAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

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
          transform: [
            { translateY: translateAnim },
            { scale: scaleAnim },
          ],
        },
        outerStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={[styles.container, shadows.glass, style]}>
          <BlurView
            intensity={30}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.blur]}
          />
          <View style={styles.overlay} />
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  container: {
    flex: 1,
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
    backgroundColor: GLASS_OVERLAY_COLOR,
    borderRadius: GLASS_BORDER_RADIUS,
  },
  content: {
    flex: 1,
  },
});
