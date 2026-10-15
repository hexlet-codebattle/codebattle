import { Loader, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { useDeployStore } from './store';
import classes from './DeployBanner.module.css';

/** Top banner during a rolling deploy (the page reloads itself when it's done). */
export function DeployBanner() {
  const { t } = useTranslation();
  const phase = useDeployStore((state) => state.phase);

  if (!phase) return null;

  const text = {
    started: t('Deploy in progress. Reconnecting game session...'),
    done: t('Deploy finished. Syncing latest session...'),
    failed: t('Deploy handoff incomplete. Reconnecting...'),
  }[phase];

  return (
    <div className={classes.banner} data-phase={phase} role="status">
      {phase !== 'failed' && <Loader size={14} color="white" />}
      <Text size="sm" fw={600}>
        {text}
      </Text>
    </div>
  );
}
