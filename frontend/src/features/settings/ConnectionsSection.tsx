import { Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlugConnected } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAgo } from '@/shared/formatAgo';

import { type OauthConnection, disconnectApplication } from './api';
import { oauthScopeLabels } from './oauthScopes';
import { Section } from './Section';
import classes from './Settings.module.css';

interface Props {
  connections: OauthConnection[];
  onChange: (connections: OauthConnection[]) => void;
}

export function ConnectionsSection({ connections, onChange }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const disconnect = async (connection: OauthConnection) => {
    setBusy(connection.id);
    try {
      await disconnectApplication(connection.id);
      onChange(connections.filter((item) => item.id !== connection.id));
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section
      id="connected-applications"
      label="Connected applications"
      icon={<IconPlugConnected size={18} />}
      title={t('Connected applications')}
      description={t('Applications with access to your Codebattle account. Disconnecting stops their access immediately.')}
    >
      {connections.length === 0 ? (
        <Text size="sm" c="dimmed">{t('No connected applications')}</Text>
      ) : (
        <div className={classes.list}>
          {connections.map((connection) => (
            <div key={connection.id} className={classes.row}>
              <div className={classes.rowBody}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>{connection.name}</Text>
                  <Text size="xs" c="dimmed">
                    {connection.last_used_at
                      ? t('Last used %{ago}', { ago: formatAgo(connection.last_used_at) })
                      : t('Never used')}
                  </Text>
                </Group>
                <Stack gap={2} mt={4}>
                  {connection.scopes.map((scope) => (
                    <Text key={scope} size="xs" c="dimmed">{t(oauthScopeLabels[scope] ?? scope)}</Text>
                  ))}
                </Stack>
              </div>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                loading={busy === connection.id}
                disabled={busy !== null}
                onClick={() => disconnect(connection)}
              >
                {t('Disconnect')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
