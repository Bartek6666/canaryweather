import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../constants/theme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -50,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={16} color={colors.textPrimary} />
        <Text style={styles.text}>{t('common.offline')}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    paddingBottom: spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  text: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
