import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { spacing, borderRadius, colors, typography, shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

interface SunChanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SunChanceModal({ visible, onClose }: SunChanceModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <BlurView
                intensity={40}
                tint="dark"
                style={[StyleSheet.absoluteFill, styles.blur]}
              />
              <View style={styles.glassOverlay} />

              <View style={styles.content}>
                {/* Header with icon */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="sunny" size={32} color="#FFD93D" />
                  </View>
                  <Text style={styles.title}>{t('sun_chance.title')}</Text>
                </View>

                {/* Description */}
                <Text style={styles.description}>{t('sun_chance.description')}</Text>

                {/* Close button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>{t('sun_chance.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: width - spacing.lg * 2,
    maxWidth: 400,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    ...shadows.lg,
  },
  blur: {
    borderRadius: borderRadius.xxl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xxl,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
    shadowColor: '#FFD93D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: spacing.xl,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.md,
  },
  closeButtonText: {
    ...typography.h3,
    color: '#0a1628',
    fontWeight: '700',
  },
});

export default SunChanceModal;
