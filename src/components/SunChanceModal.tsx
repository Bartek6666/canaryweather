import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing, fonts, light } from '../constants/theme';

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

function InfoSection({ icon, iconColor, title, text, last }: InfoSectionProps & { last?: boolean }) {
  return (
    <View style={[styles.section, !last && styles.divider]}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={20} color={iconColor} />
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
  const insets = useSafeAreaInsets();

  return (
    // Bottom sheet — same shell as SunForecastSheet (handle, title + ✕ header)
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>{t('sun_chance.title')}</Text>
              <Ionicons name="sunny" size={22} color={light.colors.accentDeep} />
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={light.colors.primary} />
            </TouchableOpacity>
          </View>

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
            last
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Sheet shell matches SunForecastSheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 55, 0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFD',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md + 4,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 82, 212, 0.18)',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: light.colors.textPrimary,
    flexShrink: 1,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 82, 212, 0.12)',
  },
  // Rows mirror SunForecastSheet's InfoRow (36 px soft icon circle)
  section: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: light.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: light.colors.textPrimary,
    marginBottom: 2,
  },
  sectionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: light.colors.textSecondary,
  },
});
