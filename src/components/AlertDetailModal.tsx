import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, colors } from '../constants/theme';
import { CoastalAlert, AlertSeverity } from '../types';
import { formatAlertDateTime } from '../utils/dateUtils';

// Severity-specific colors and labels
const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string;
  bgColor: string;
  labelKey: string;
  iconName: 'warning' | 'alert-circle' | 'alert-outline';
}> = {
  yellow: {
    color: '#FFCC00',
    bgColor: 'rgba(255, 204, 0, 0.15)',
    labelKey: 'alerts.severityYellow',
    iconName: 'alert-outline',
  },
  orange: {
    color: '#FF8C00',
    bgColor: 'rgba(255, 140, 0, 0.15)',
    labelKey: 'alerts.severityOrange',
    iconName: 'alert-circle',
  },
  red: {
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.15)',
    labelKey: 'alerts.severityRed',
    iconName: 'warning',
  },
};

interface AlertDetailModalProps {
  visible: boolean;
  alert: CoastalAlert | null;
  onClose: () => void;
}

/**
 * AlertDetailModal - Full-screen modal showing detailed alert information
 *
 * Displays:
 * - Alert type header (Fenómenos Costeros)
 * - Severity level with color-coded badge
 * - Original AEMET description (Spanish)
 * - Validity time range (start - end)
 */
export function AlertDetailModal({ visible, alert, onClose }: AlertDetailModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!alert) return null;

  const severityConfig = SEVERITY_CONFIG[alert.severity];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalContent, { marginTop: insets.top + 20, marginBottom: insets.bottom + 20 }]}>
          <BlurView
            intensity={80}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.modalBlur]}
          />
          <View style={styles.modalOverlay} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <MaterialCommunityIcons name="waves" size={24} color={severityConfig.color} />
              <Text style={styles.modalTitle}>{t('alerts.coastalPhenomena')}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Severity Level Section */}
            <View style={styles.severitySection}>
              <View style={[styles.severityBadge, { backgroundColor: severityConfig.bgColor, borderColor: severityConfig.color }]}>
                <Ionicons name={severityConfig.iconName} size={20} color={severityConfig.color} />
                <Text style={[styles.severityText, { color: severityConfig.color }]}>
                  {t(severityConfig.labelKey)}
                </Text>
              </View>
            </View>

            {/* Validity Period Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('alerts.validityPeriod')}</Text>
              </View>
              <View style={styles.timeContainer}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{t('alerts.from')}:</Text>
                  <Text style={styles.timeValue}>{formatAlertDateTime(alert.startTime)}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{t('alerts.to')}:</Text>
                  <Text style={styles.timeValue}>{formatAlertDateTime(alert.endTime)}</Text>
                </View>
              </View>
            </View>

            {/* Affected Area Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={20} color={colors.rain} />
                <Text style={styles.sectionTitle}>{t('alerts.affectedArea')}</Text>
              </View>
              <Text style={styles.areaText}>{alert.areaName}</Text>
            </View>

            {/* Official AEMET Description Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                <Text style={styles.sectionTitle}>{t('alerts.officialAemetMessage')}</Text>
              </View>
              <View style={styles.descriptionContainer}>
                {alert.description ? (
                  <Text style={styles.descriptionText}>{alert.description}</Text>
                ) : (
                  <Text style={styles.descriptionPlaceholder}>
                    {t('alerts.noDescriptionAvailable')}
                  </Text>
                )}
              </View>
            </View>

            {/* Source Attribution */}
            <View style={styles.sourceSection}>
              <Text style={styles.sourceText}>
                {t('alerts.dataSource')}
              </Text>
            </View>

            <View style={styles.modalBottomSpacer} />
          </ScrollView>

          {/* Close Button */}
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity style={styles.closeButtonPrimary} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('alerts.close')}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalBlur: {
    borderRadius: 20,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    padding: spacing.lg,
  },
  severitySection: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
  },
  severityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  timeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  areaText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  descriptionPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  sourceSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  modalBottomSpacer: {
    height: spacing.lg,
  },
  closeButtonContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  closeButtonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AlertDetailModal;
