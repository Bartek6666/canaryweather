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
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing, borderRadius, fonts, light } from '../constants/theme';

const { width } = Dimensions.get('window');

interface SunChanceModalProps {
  visible: boolean;
  onClose: () => void;
}

interface InfoSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  text: string;
}

function InfoSection({ icon, iconColor, title, text }: InfoSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.sectionBody}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionText}>{text}</Text>
      </View>
    </View>
  );
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
                tint="light"
                style={[StyleSheet.absoluteFill, styles.blur]}
              />
              <View style={styles.glassOverlay} />

              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerTitle}>
                    <Ionicons name="sunny" size={22} color={light.colors.accentDeep} />
                    <Text style={styles.title}>{t('sun_chance.title')}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={24} color={light.colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Sections */}
                <View style={styles.sections}>
                  <InfoSection
                    icon="help-circle-outline"
                    iconColor={light.colors.primary}
                    title={t('sun_chance.what_title')}
                    text={t('sun_chance.what_text')}
                  />
                  <InfoSection
                    icon="bar-chart-outline"
                    iconColor={light.colors.accentDeep}
                    title={t('sun_chance.how_title')}
                    text={t('sun_chance.how_text')}
                  />
                  <InfoSection
                    icon="information-circle-outline"
                    iconColor={light.colors.rain}
                    title={t('sun_chance.note_title')}
                    text={t('sun_chance.note_text')}
                  />
                </View>
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
    backgroundColor: 'rgba(15, 30, 55, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: width - spacing.lg * 2,
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
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: light.colors.textPrimary,
  },
  sections: {
    gap: spacing.md,
  },
  section: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: light.colors.textPrimary,
    marginBottom: 1,
  },
  sectionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: light.colors.textSecondary,
  },
});
