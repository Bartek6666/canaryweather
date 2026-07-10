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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { spacing, borderRadius, fonts, light } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LocationPromptProps {
  visible: boolean;
  onUseLocation: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

export function LocationPrompt({
  visible,
  onUseLocation,
  onDismiss,
  isLoading = false,
}: LocationPromptProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { scale: scaleAnim },
              { translateY },
            ],
          },
        ]}
      >
        <BlurView
          intensity={40}
          tint="light"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
        <View style={styles.glassOverlay} />

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <Ionicons name="location-outline" size={48} color={light.colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('locationPrompt.title')}</Text>

          {/* Description */}
          <Text style={styles.description}>{t('locationPrompt.description')}</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            {/* Primary button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onUseLocation}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.primaryButtonInner}>
                {isLoading ? (
                  <Animated.View style={styles.loadingDot} />
                ) : (
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>
                  {isLoading ? t('search.searching') : t('locationPrompt.useLocation')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Secondary button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>{t('locationPrompt.enterManually')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 30, 55, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    maxWidth: 360,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: light.colors.border,
    overflow: 'hidden',
    ...light.cardShadow,
  },
  blur: {
    borderRadius: borderRadius.xxl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: borderRadius.xxl,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: light.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: light.colors.primary,
    opacity: 0.12,
    shadowColor: light.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: light.colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: light.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: light.colors.primary,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: light.colors.textMuted,
  },
  loadingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
  },
});
