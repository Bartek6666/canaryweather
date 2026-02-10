import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, spacing, shadows, glassTokens } from '../constants/theme';
import { changeLanguage, LanguageCode } from '../i18n';

// Language options with display codes
const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'pl', label: 'PL' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
];

interface LanguageSwitcherProps {
  delay?: number;
}

export function LanguageSwitcher({ delay = 0 }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'en') as LanguageCode;
  const [isOpen, setIsOpen] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  // Chevron rotation animation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleLanguageSelect = useCallback(async (language: LanguageCode) => {
    if (language !== currentLanguage) {
      await changeLanguage(language);
    }
    setIsOpen(false);
  }, [currentLanguage]);

  const currentLabel = LANGUAGES.find(l => l.code === currentLanguage)?.label || 'EN';
  const otherLanguages = LANGUAGES.filter(l => l.code !== currentLanguage);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      {/* Main Button */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, styles.blur]} />
        <View style={styles.overlay} />
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>{currentLabel}</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons name="chevron-down" size={15} color={colors.textPrimary} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {isOpen && (
        <View style={styles.dropdown}>
          <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, styles.blur]} />
          <View style={styles.overlay} />
          {otherLanguages.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.dropdownItem,
                index < otherLanguages.length - 1 && styles.dropdownItemBorder,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownItemText}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsOpen(false)}
        />
      )}
    </Animated.View>
  );
}

const BUTTON_MIN_WIDTH = 68;
const BORDER_RADIUS = 13;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  mainButton: {
    minWidth: BUTTON_MIN_WIDTH,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    overflow: 'hidden',
    ...shadows.glass,
  },
  blur: {
    borderRadius: BORDER_RADIUS,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glassTokens.bgDefault,
    borderRadius: BORDER_RADIUS,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: spacing.xs,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.sm,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    overflow: 'hidden',
    zIndex: 101,
    ...shadows.glass,
  },
  dropdownItem: {
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 99,
  },
});

export default LanguageSwitcher;
