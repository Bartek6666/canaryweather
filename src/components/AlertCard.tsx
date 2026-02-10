import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { spacing, glassTokens, shadows } from '../constants/theme';

// Orange tint for Calima alert
const ALERT_ORANGE = 'rgba(255, 140, 0, 0.2)';
const ALERT_ICON_COLOR = '#FF8C00';
const ALERT_GLOW_COLOR = 'rgba(255, 140, 0, 0.6)';

interface AlertCardProps {
  type?: 'calima';
  visible?: boolean;
}

export function AlertCard({ type = 'calima', visible = true }: AlertCardProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  const getAlertContent = () => {
    switch (type) {
      case 'calima':
      default:
        return {
          title: t('result.calimaAlert'),
          description: t('result.calimaDesc'),
          icon: 'warning-outline' as const,
        };
    }
  };

  const content = getAlertContent();

  return (
    <MotiView
      from={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{
        type: 'timing',
        duration: 1200,
        loop: true,
      }}
      style={styles.wrapper}
    >
      <View style={styles.container}>
        <BlurView
          intensity={glassTokens.blurIntensity}
          tint="light"
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
        <View style={styles.overlay} />

        <View style={styles.content}>
          {/* Icon with glow */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={content.icon}
              size={28}
              color={ALERT_ICON_COLOR}
              style={styles.icon}
            />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    borderRadius: glassTokens.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.4)',
    overflow: 'hidden',
    ...shadows.glass,
  },
  blur: {
    borderRadius: glassTokens.borderRadius,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ALERT_ORANGE,
    borderRadius: glassTokens.borderRadius,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    // Glow effect
    shadowColor: ALERT_GLOW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  icon: {
    textShadowColor: ALERT_GLOW_COLOR,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  textContainer: {
    flex: 1,
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
});

export default AlertCard;
