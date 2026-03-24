import React from 'react';
import { useTranslation } from 'react-i18next';

import { GenericAlertCard } from './common/GenericAlertCard';
import { CoastalAlert } from '../types';

interface SnowAlertCardProps {
  alert: CoastalAlert;
  onPress: () => void;
}

/**
 * SnowAlertCard - Snow alert wrapper for high altitude areas (Teide, etc.)
 *
 * Uses GenericAlertCard for display with dynamic severity coloring.
 * Severity is determined by AEMET alert level (yellow/orange/red).
 */
export function SnowAlertCard({ alert, onPress }: SnowAlertCardProps) {
  const { t } = useTranslation();

  return (
    <GenericAlertCard
      severity={alert.severity}
      icon={{ library: 'material', name: 'snowflake' }}
      title={t('result.snowAlert')}
      description={t('result.snowAlertDesc')}
      onPress={onPress}
      showSeverityBadge={false}
      showChevron={true}
    />
  );
}
