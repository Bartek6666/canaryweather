import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { spacing, borderRadius, colors } from '../constants/theme';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = 'hasSeenOnboarding';

type RootStackParamList = {
  Onboarding: undefined;
  Search: undefined;
  Result: { stationId: string; locationAlias?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered fade-in animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStart = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.warn('Failed to save onboarding status:', error);
    }
    navigation.replace('Search');
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0a1628', '#1a2a4a', '#0a1628']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        {/* Sun icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Ionicons name="sunny" size={80} color="#FFCC00" />
        </Animated.View>

        {/* Glass card with text */}
        <Animated.View
          style={[
            styles.glassCardWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.glassCard}>
            <BlurView
              intensity={20}
              tint="light"
              style={[StyleSheet.absoluteFill, styles.blur]}
            />
            <View style={styles.glassOverlay} />

            <View style={styles.textContent}>
              <Text style={styles.title}>{t('onboarding.welcome_title')}</Text>
              <Text style={styles.description}>{t('onboarding.welcome_text')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Start button */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim }]}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFCC00', '#FFB800']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>{t('onboarding.start_button')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#0a1628" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glassCardWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  glassCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  blur: {
    borderRadius: borderRadius.xl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
  },
  textContent: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: spacing.xl * 2,
    width: '100%',
    maxWidth: 300,
  },
  startButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a1628',
    marginRight: spacing.sm,
  },
  buttonIcon: {
    marginLeft: spacing.xs,
  },
});
