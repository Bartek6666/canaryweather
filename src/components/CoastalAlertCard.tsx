import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { spacing, glassTokens, shadows } from '../constants/theme';
import { CoastalAlert, AlertSeverity } from '../types';

// Colors for different alert severity levels
const ALERT_COLORS: Record<AlertSeverity, {
  bg: string;
  border: string;
  icon: string;
  glow: string;
}> = {
  yellow: {
    bg: 'rgba(255, 204, 0, 0.2)',
    border: 'rgba(255, 204, 0, 0.4)',
    icon: '#FFCC00',
    glow: 'rgba(255, 204, 0, 0.6)',
  },
  orange: {
    bg: 'rgba(255, 140, 0, 0.2)',
    border: 'rgba(255, 140, 0, 0.4)',
    icon: '#FF8C00',
    glow: 'rgba(255, 140, 0, 0.6)',
  },
  red: {
    bg: 'rgba(255, 59, 48, 0.2)',
    border: 'rgba(255, 59, 48, 0.4)',
    icon: '#FF3B30',
    glow: 'rgba(255, 59, 48, 0.6)',
  },
};

interface CoastalAlertCardProps {
  alert: CoastalAlert;
  onPress: () => void;
}

/**
 * CoastalAlertCard - Displays coastal weather alert (high waves, storm surge)
 *
 * Uses glassmorphism style with color-coded severity:
 * - Yellow: Minor coastal phenomena
 * - Orange: Significant coastal phenomena (high waves)
 * - Red: Extreme coastal phenomena (dangerous conditions)
 */
export function CoastalAlertCard({ alert, onPress }: CoastalAlertCardProps) {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // More intense pulsing for higher severity alerts
  const pulseDuration = alert.severity === 'red' ? 800 : alert.severity === 'orange' ? 1000 : 1200;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: pulseDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseDuration]);

  const colors = ALERT_COLORS[alert.severity];

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Animated.View style={[styles.wrapper, { opacity: pulseAnim }]}>
        <View style={[styles.container, { borderColor: colors.border }]}>
          <BlurView
            intensity={glassTokens.blurIntensity}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.blur]}
          />
          <View style={[styles.overlay, { backgroundColor: colors.bg }]} />

          <View style={styles.content}>
            {/* Icon with glow - wave icon for coastal alerts */}
            <View style={[styles.iconContainer, { backgroundColor: `${colors.icon}15`, shadowColor: colors.glow }]}>
              <MaterialCommunityIcons
                name="waves"
                size={28}
                color={colors.icon}
                style={[styles.icon, { textShadowColor: colors.glow }]}
              />
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{t('result.coastalAlert')}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {t('result.coastalAlertDesc')}
              </Text>
            </View>

            {/* Severity badge + chevron */}
            <View style={styles.rightSection}>
              <View style={[styles.severityBadge, { backgroundColor: colors.icon }]}>
                <Ionicons
                  name={alert.severity === 'red' ? 'warning' : 'alert-circle'}
                  size={12}
                  color="#FFFFFF"
                />
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    borderRadius: glassTokens.borderRadius,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.glass,
  },
  blur: {
    borderRadius: glassTokens.borderRadius,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: glassTokens.borderRadius,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  icon: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  severityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CoastalAlertCard;
