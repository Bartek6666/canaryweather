import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing, borderRadius, fonts, light } from '../constants/theme';
import { GlassCard, SunlyIcon } from '../components';

const ONBOARDING_KEY = 'hasSeenOnboarding';
const INTRO_DURATION_MS = 3000;

type RootStackParamList = {
  Onboarding: undefined;
  Search: undefined;
  Result: { stationId: string; locationAlias?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  // Intro (step 1) animation
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introScale = useRef(new Animated.Value(0.9)).current;

  // Step 2 entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in intro, then auto-advance to step 2 after INTRO_DURATION_MS
  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(introScale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setStep(2));
    }, INTRO_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  // Run the step 2 entrance once it mounts
  useEffect(() => {
    if (step !== 2) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

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
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#DCEEFF', '#E4EEFB', '#F8F9FF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {step === 1 ? (
          <Animated.View
            style={[
              styles.introWrap,
              { opacity: introOpacity, transform: [{ scale: introScale }] },
            ]}
          >
            <View style={styles.iconShadow}>
              <SunlyIcon size={132} />
            </View>
            <Text style={styles.introBrand}>Sunly</Text>
          </Animated.View>
        ) : (
          <>
            {/* Hero content */}
            <Animated.View
              style={[
                styles.hero,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={styles.brand}>Sunly</Text>
              <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
              <Text style={styles.description}>{t('onboarding.welcome_text')}</Text>

              <View style={styles.bentoRow}>
                <GlassCard scheme="light" style={styles.bentoCard} delay={300}>
                  <View style={styles.bentoInner}>
                    <Ionicons
                      name="time-outline"
                      size={26}
                      color={light.colors.primary}
                    />
                    <Text style={styles.bentoLabel}>
                      {t('onboarding.tile_analysis_label')}
                    </Text>
                    <Text style={styles.bentoValue}>
                      {t('onboarding.tile_years_value')}
                    </Text>
                  </View>
                </GlassCard>

                <GlassCard scheme="light" style={styles.bentoCard} delay={400}>
                  <View style={styles.bentoInner}>
                    <Ionicons
                      name="cloud-done-outline"
                      size={26}
                      color={light.colors.accentDeep}
                    />
                    <Text style={styles.bentoLabel}>
                      {t('onboarding.tile_precision_label')}
                    </Text>
                    <Text style={styles.bentoValue}>AEMET</Text>
                  </View>
                </GlassCard>
              </View>
            </Animated.View>

            {/* Action area */}
            <Animated.View style={[styles.footer, { opacity: buttonFadeAnim }]}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStart}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>{t('onboarding.start_button')}</Text>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: light.colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // ── Step 1 (intro) ──
  introWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  iconShadow: {
    borderRadius: 22,
    shadowColor: '#0064C8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  introBrand: {
    fontFamily: fonts.extrabold,
    fontSize: 40,
    color: light.colors.primary,
    letterSpacing: 0.5,
  },
  // ── Step 2 ──
  hero: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    color: light.colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  tagline: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 30,
    color: light.colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    maxWidth: 340,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: light.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
  },
  bentoCard: {
    flex: 1,
  },
  bentoInner: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  bentoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: light.colors.textMuted,
  },
  bentoValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: light.colors.textPrimary,
  },
  footer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
  },
  startButton: {
    width: '100%',
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: light.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: light.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
