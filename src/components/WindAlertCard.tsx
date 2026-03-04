import React from 'react';
import { useTranslation } from 'react-i18next';

import { GenericAlertCard } from './common/GenericAlertCard';
import { CoastalAlert } from '../types';

interface WindAlertCardProps {
  alert: CoastalAlert;
  onPress: () => void;
}

/**
 * WindAlertCard - Strong wind alert wrapper
 *
 * Uses GenericAlertCard for display with dynamic severity coloring.
 * Severity is determined by AEMET alert level (yellow/orange/red).
 */
export function WindAlertCard({ alert, onPress }: WindAlertCardProps) {
  const { t } = useTranslation();

  return (
    <GenericAlertCard
      severity={alert.severity}
      icon={{ library: 'material', name: 'weather-windy' }}
      title={t('result.windAlert')}
      description={t('result.windAlertDesc')}
      onPress={onPress}
      showSeverityBadge={false}
      showChevron={true}
    />
  );
}

export default WindAlertCard;
