import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, colors } from '../constants/theme';
import { CoastalAlert, AlertSeverity } from '../types';
import { formatAlertDateTime } from '../utils/dateUtils';
import { translateAlertDescription } from '../services/translationService';

export type AlertType = 'coastal' | 'wind' | 'snow';

// Severity-specific colors
const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string;
  bgColor: string;
  labelKey: string;
}> = {
  yellow: {
    color: '#FFCC00',
    bgColor: 'rgba(255, 204, 0, 0.15)',
    labelKey: 'alerts.severityYellow',
  },
  orange: {
    color: '#FF8C00',
    bgColor: 'rgba(255, 140, 0, 0.15)',
    labelKey: 'alerts.severityOrange',
  },
  red: {
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.15)',
    labelKey: 'alerts.severityRed',
  },
};

// Alert type configuration
const ALERT_TYPE_CONFIG: Record<AlertType, {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  titleKey: string;
}> = {
  coastal: {
    icon: 'waves',
    titleKey: 'alerts.titleCoastal',
  },
  wind: {
    icon: 'weather-windy',
    titleKey: 'alerts.titleWind',
  },
  snow: {
    icon: 'snowflake',
    titleKey: 'alerts.titleSnow',
  },
};

interface AlertDetailModalProps {
  visible: boolean;
  alert: CoastalAlert | null;
  alertType?: AlertType;
  onClose: () => void;
}

/**
 * AlertDetailModal - Simplified modal showing alert information
 */
export function AlertDetailModal({ visible, alert, alertType = 'coastal', onClose }: AlertDetailModalProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [translatedDescription, setTranslatedDescription] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Translate description when modal opens or language changes
  useEffect(() => {
    if (!visible || !alert?.description) {
      setTranslatedDescription('');
      return;
    }

    let cancelled = false;

    async function translate() {
      setIsTranslating(true);
      try {
        const result = await translateAlertDescription(alert!.description);
        if (!cancelled) {
          setTranslatedDescription(result.text);
        }
      } catch (error) {
        console.warn('[AlertDetailModal] Translation error:', error);
        if (!cancelled) {
          setTranslatedDescription(alert!.description);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    }

    translate();

    return () => {
      cancelled = true;
    };
  }, [visible, alert?.description, alert?.id, i18n.language]);

  if (!alert) return null;

  const severityConfig = SEVERITY_CONFIG[alert.severity];
  const typeConfig = ALERT_TYPE_CONFIG[alertType];

  // Format time range in one line
  const timeRange = `${formatAlertDateTime(alert.startTime)} – ${formatAlertDateTime(alert.endTime)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalContent, { marginTop: insets.top + 40, marginBottom: insets.bottom + 40 }]}>
          <BlurView
            intensity={80}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.modalBlur]}
          />
          <View style={styles.modalOverlay} />

          {/* Header with dynamic title */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name={typeConfig.icon}
                size={28}
                color={severityConfig.color}
              />
              <Text style={[styles.title, { color: severityConfig.color }]}>
                {t(typeConfig.titleKey)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Severity Badge */}
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.bgColor, borderColor: severityConfig.color }]}>
              <Ionicons name="warning" size={16} color={severityConfig.color} />
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {t(severityConfig.labelKey)}
              </Text>
            </View>

            {/* Main Description */}
            <View style={styles.descriptionSection}>
              {isTranslating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <Text style={styles.descriptionText}>
                  {translatedDescription || alert.description || t('alerts.noDescriptionAvailable')}
                </Text>
              )}
            </View>

            {/* Location */}
            <View style={styles.infoRow}>
              <Ionicons name="location" size={22} color={colors.rain} />
              <Text style={styles.infoText}>{alert.areaName}</Text>
            </View>

            {/* Time */}
            <View style={styles.infoRow}>
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={styles.infoText}>{timeRange}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Source */}
            <Text style={styles.sourceText}>{t('alerts.dataSource')}</Text>
          </View>

          {/* Close Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, { backgroundColor: severityConfig.color }]} onPress={onClose}>
              <Text style={styles.buttonText}>{t('alerts.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalBlur: {
    borderRadius: 24,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 25, 30, 0.9)',
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: spacing.lg,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
