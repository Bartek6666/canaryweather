import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, glassTokens, shadows, colors } from '../constants/theme';

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
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [visible]);

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
    <>
      <Animated.View style={[styles.wrapper, { opacity: pulseAnim }]}>
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

            {/* Info button */}
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInfoModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle" size={24} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowInfoModal(false)} />

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
                <Ionicons name="warning" size={24} color={ALERT_ICON_COLOR} />
                <Text style={styles.modalTitle}>{t('result.calimaInfoTitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInfoModal(false)}
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
                  <Ionicons name="eye-outline" size={20} color={ALERT_ICON_COLOR} />
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
    </>
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
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },

  // Modal styles
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

export default AlertCard;
