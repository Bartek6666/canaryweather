import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GenericAlertCard } from './common/GenericAlertCard';
import { CalimaInfoModal } from './CalimaInfoModal';

interface AlertCardProps {
  type?: 'calima';
  visible?: boolean;
}

/**
 * AlertCard - Calima (Saharan dust) alert wrapper
 *
 * Uses GenericAlertCard for display and CalimaInfoModal for details.
 * Calima alerts always use orange severity.
 */
export function AlertCard({ type = 'calima', visible = true }: AlertCardProps) {
  const { t } = useTranslation();
  const [showInfoModal, setShowInfoModal] = useState(false);

  if (!visible) return null;

  return (
    <>
      <GenericAlertCard
        severity="orange"
        icon={{ library: 'ionicons', name: 'warning-outline' }}
        title={t('result.calimaAlert')}
        description={t('result.calimaDesc')}
        onPress={() => setShowInfoModal(true)}
        showSeverityBadge={false}
        showChevron={true}
      />
      <CalimaInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  );
}
