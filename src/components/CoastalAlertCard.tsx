import React from 'react';
import { useTranslation } from 'react-i18next';

import { GenericAlertCard } from './common/GenericAlertCard';
import { CoastalAlert } from '../types';

interface CoastalAlertCardProps {
  alert: CoastalAlert;
  onPress: () => void;
}

/**
 * CoastalAlertCard - High waves / coastal phenomena alert wrapper
 *
 * Uses GenericAlertCard for display with dynamic severity coloring.
 * Severity is determined by AEMET alert level (yellow/orange/red).
 */
export function CoastalAlertCard({ alert, onPress }: CoastalAlertCardProps) {
  const { t } = useTranslation();

  return (
    <GenericAlertCard
      severity={alert.severity}
      icon={{ library: 'material', name: 'waves' }}
      title={t('result.coastalAlert')}
      description={t('result.coastalAlertDesc')}
      onPress={onPress}
      showSeverityBadge={false}
      showChevron={true}
    />
  );
}

export default CoastalAlertCard;
