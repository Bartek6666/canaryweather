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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, shadows, borderRadius } from '../constants/theme';

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
          tint="dark"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
        <View style={styles.glassOverlay} />

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <Ionicons name="location-outline" size={48} color={colors.primary} />
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
                  <Ionicons name="navigate" size={20} color={colors.textPrimary} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    maxWidth: 360,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    ...shadows.glass,
  },
  blur: {
    borderRadius: borderRadius.xl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    opacity: 0.2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
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
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '500',
  },
  loadingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderTopColor: 'transparent',
  },
});

export default LocationPrompt;
