import { Anchor, Button, Group, Paper, Text } from '@mantine/core';
import { IconCookie } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import classes from './CookieNotice.module.css';

// We only set strictly necessary cookies/storage, which need no consent anywhere (GDPR/ePrivacy,
// UK PECR, CCPA, LGPD, 152-FZ…), so this is a one-time notice, not an accept/reject prompt.
// If a non-essential tracker is ever added, it needs a real opt-in here before it loads.
const DISMISSED_KEY = 'cb.privacyNoticeDismissed';

function dismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function CookieNotice() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => !dismissed());

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // storage disabled: hide it for this page only
    }
    setOpen(false);
  };

  return (
    <Paper className={classes.notice} shadow="lg" p="md" withBorder role="region" aria-label={t('Cookies')}>
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <IconCookie size={20} className={classes.icon} aria-hidden />
        <Text size="sm">
          {t('We use only essential cookies and local storage: to keep you signed in and remember your settings. No ads, no tracking.')}{' '}
          <Anchor href="/privacy" size="sm">
            {t('Privacy Policy')}
          </Anchor>
        </Text>
      </Group>
      <Group justify="flex-end" mt="sm">
        <Button size="compact-sm" onClick={dismiss}>
          {t('Got it')}
        </Button>
      </Group>
    </Paper>
  );
}
