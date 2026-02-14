import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { WeatherCondition } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WeatherEffectsProps {
  condition: WeatherCondition;
}

// Rain drop component using native Animated
function RainDrop({ index }: { index: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const randomX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const randomDelay = useMemo(() => Math.random() * 3000, []);
  const randomDuration = useMemo(() => 1500 + Math.random() * 1500, []);
  const randomHeight = useMemo(() => 15 + Math.random() * 25, []);

  useEffect(() => {
    const startAnimation = () => {
      translateY.setValue(-50);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 100,
          duration: randomDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: randomDuration - 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => startAnimation());
    };

    const timeout = setTimeout(startAnimation, randomDelay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          left: randomX,
          height: randomHeight,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
}

// Sun glow orb component using native Animated
function SunOrb({ index }: { index: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.08)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const baseX = useMemo(() => (index === 0 ? SCREEN_WIDTH * 0.2 : SCREEN_WIDTH * 0.75), [index]);
  const baseY = useMemo(() => (index === 0 ? SCREEN_HEIGHT * 0.15 : SCREEN_HEIGHT * 0.35), [index]);
  const size = useMemo(() => (index === 0 ? 200 : 150), [index]);

  useEffect(() => {
    // Slow pulsing scale
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 4000 + index * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 4000 + index * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle opacity variation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.12,
          duration: 3000 + index * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.06,
          duration: 3000 + index * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle position drift X
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 20,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -20,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle position drift Y with delay
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: 15,
            duration: 5000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -15,
            duration: 5000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.sunOrb,
        {
          left: baseX - size / 2,
          top: baseY - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    />
  );
}

// Cloud particle for cloudy/foggy weather
function CloudParticle({ index }: { index: number }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.05)).current;

  const baseX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
  const baseY = useMemo(() => 50 + Math.random() * (SCREEN_HEIGHT * 0.4), []);
  const size = useMemo(() => 100 + Math.random() * 150, []);

  useEffect(() => {
    // Slow horizontal drift
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 30 + Math.random() * 20,
          duration: 8000 + index * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -30 - Math.random() * 20,
          duration: 8000 + index * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Very subtle opacity pulse with delay
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.08,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.04,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, index * 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.cloudParticle,
        {
          left: baseX - size / 2,
          top: baseY,
          width: size,
          height: size * 0.6,
          borderRadius: size / 2,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    />
  );
}

export function WeatherEffects({ condition }: WeatherEffectsProps) {
  // Memoize rain drops for performance
  const rainDrops = useMemo(() => {
    if (condition !== 'rainy' && condition !== 'stormy') return null;
    const drops = [];
    const dropCount = condition === 'stormy' ? 35 : 25;
    for (let i = 0; i < dropCount; i++) {
      drops.push(<RainDrop key={`rain-${i}`} index={i} />);
    }
    return drops;
  }, [condition]);

  // Memoize sun orbs for performance
  const sunOrbs = useMemo(() => {
    if (condition !== 'sunny' && condition !== 'partly-sunny') return null;
    return (
      <>
        <SunOrb index={0} />
        <SunOrb index={1} />
      </>
    );
  }, [condition]);

  // Memoize cloud particles for performance
  const cloudParticles = useMemo(() => {
    if (condition !== 'cloudy' && condition !== 'foggy' && condition !== 'partly-sunny') return null;
    const particles = [];
    const count = condition === 'foggy' ? 5 : 3;
    for (let i = 0; i < count; i++) {
      particles.push(<CloudParticle key={`cloud-${i}`} index={i} />);
    }
    return particles;
  }, [condition]);

  return (
    <View style={styles.container} pointerEvents="none">
      {sunOrbs}
      {cloudParticles}
      {rainDrops}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  rainDrop: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  sunOrb: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 0,
  },
  cloudParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 0,
  },
});
