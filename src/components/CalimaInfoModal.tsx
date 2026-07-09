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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, fonts, light } from '../constants/theme';

const CALIMA_ICON_COLOR = '#FF8C00';

interface CalimaInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * CalimaInfoModal - Educational modal explaining the Calima phenomenon
 *
 * Displays:
 * - What is Calima
 * - Characteristic symptoms (atmosphere, meteorological conditions)
 * - When it occurs
 * - Dangers and health risks
 * - Safety recommendations
 */
export function CalimaInfoModal({ visible, onClose }: CalimaInfoModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
            intensity={40}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.modalBlur]}
          />
          <View style={styles.modalOverlay} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="warning" size={24} color={CALIMA_ICON_COLOR} />
              <Text style={styles.modalTitle}>{t('result.calimaInfoTitle')}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={light.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* What is Calima */}
            <Text style={styles.modalText}>{t('result.calimaInfoWhat')}</Text>

            {/* Symptoms Section */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="eye-outline" size={20} color={CALIMA_ICON_COLOR} />
                <Text style={styles.sectionTitle}>{t('result.calimaInfoSymptoms')}</Text>
              </View>

              {/* Atmosphere subsection */}
              <Text style={styles.subsectionTitle}>{t('result.calimaInfoAtmosphere')}</Text>
              <Text style={styles.modalList}>{t('result.calimaInfoAtmosphereList')}</Text>

              {/* Meteo subsection */}
              <Text style={styles.subsectionTitle}>{t('result.calimaInfoMeteo')}</Text>
              <Text style={styles.modalList}>{t('result.calimaInfoMeteoList')}</Text>
            </View>

            {/* When does it occur */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={20} color="#9B59B6" />
                <Text style={styles.sectionTitle}>{t('result.calimaInfoWhen')}</Text>
              </View>
              <Text style={styles.modalList}>{t('result.calimaInfoWhenDesc')}</Text>
            </View>

            {/* Dangers */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                <Text style={styles.sectionTitle}>{t('result.calimaInfoDangers')}</Text>
              </View>
              <Text style={styles.modalList}>{t('result.calimaInfoDangersList')}</Text>
            </View>

            {/* Safety */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
                <Text style={styles.sectionTitle}>{t('result.calimaInfoSafety')}</Text>
              </View>
              <Text style={styles.modalList}>{t('result.calimaInfoSafetyList')}</Text>
            </View>

            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 55, 0.35)',
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
    borderColor: light.colors.border,
    ...light.cardShadow,
  },
  modalBlur: {
    borderRadius: 20,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: light.colors.textPrimary,
    marginLeft: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    padding: spacing.lg,
  },
  modalText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: light.colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: light.colors.textPrimary,
    marginLeft: spacing.sm,
  },
  subsectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: light.colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalList: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: light.colors.textSecondary,
    lineHeight: 24,
    paddingLeft: spacing.xs,
  },
  modalBottomSpacer: {
    height: spacing.lg,
  },
});
