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

import { spacing } from '../constants/theme';

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
            intensity={80}
            tint="dark"
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
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
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
    borderColor: 'rgba(255, 140, 0, 0.3)',
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
  modalText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalList: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    paddingLeft: spacing.xs,
  },
  modalBottomSpacer: {
    height: spacing.lg,
  },
});

export default CalimaInfoModal;
