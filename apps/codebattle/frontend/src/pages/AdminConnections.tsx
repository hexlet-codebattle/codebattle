import { Head } from '@inertiajs/react';
import { ActionIcon, Card, Center, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import classes from '@/features/adminConnections/AdminConnections.module.css';
import { ConnectionModal } from '@/features/adminConnections/ConnectionModal';
import {
  type Connection,
  countConnections,
  groupConnections,
  labelColor,
  mergeUserIds,
  parseUserIds,
} from '@/features/adminConnections/connections';
import { RedirectPanel } from '@/features/adminConnections/RedirectPanel';
import { usePresenceStore } from '@/features/presence/store';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { UserAvatar } from '@/shared/UserAvatar';

// Live socket monitor (AdminController.connections): every "main" channel
// connection grouped by the page it's on, plus a bulk redirect tool.
export default function AdminConnections() {
  const { t } = useTranslation();
  const raw = usePresenceStore((state) => state.raw);
  const synced = usePresenceStore((state) => state.synced);
  const [selected, setSelected] = useState<Connection | null>(null);
  const [userIdsText, setUserIdsText] = useState('');

  const groups = useMemo(() => groupConnections(raw), [raw]);
  const userCount = Object.keys(raw).length;
  const connectionCount = useMemo(() => countConnections(raw), [raw]);
  const connectedUserIds = useMemo(() => Object.keys(raw).map(Number).filter(Boolean), [raw]);
  const chosen = useMemo(() => new Set(parseUserIds(userIdsText)), [userIdsText]);

  const addUsers = useCallback((ids: number[]) => setUserIdsText((current) => mergeUserIds(current, ids)), []);

  return (
    <AppLayout wide>
      <Head title={t('Live connections')} />
      <PageHeader
        title={t('Live connections')}
        subtitle={`${t('Users')}: ${userCount} · ${t('Connections')}: ${connectionCount}`}
      />

      <RedirectPanel userIdsText={userIdsText} setUserIdsText={setUserIdsText} connectedUserIds={connectedUserIds} />

      {groups.length === 0 ? (
        <Center py="xl">
          <Text size="sm" c="dimmed">
            {synced ? t('No active connections') : t('Loading...')}
          </Text>
        </Center>
      ) : (
        <Stack gap="md">
          {groups.map((group) => (
            <Card key={group.label} padding="sm">
              <Group gap={8} mb={8} wrap="nowrap">
                <span className={classes.dot} style={{ '--dot': labelColor(group.label) } as CSSProperties} />
                <Text fw={700} c="bright">
                  {group.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {group.userIds.length} · {group.connections.length}
                </Text>
                <Tooltip label={t('Add all to redirect list')}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    aria-label={t('Add all to redirect list')}
                    onClick={() => addUsers(group.userIds)}
                  >
                    <IconPlus size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group gap={6}>
                {group.connections.map((connection) => (
                  <UnstyledButton
                    key={connection.key}
                    className={classes.chip}
                    data-selected={chosen.has(connection.userId) || undefined}
                    title={connection.path ?? undefined}
                    onClick={() => setSelected(connection)}
                  >
                    <UserAvatar user={{ id: connection.userId, avatar_url: connection.avatarUrl }} size={18} />
                    <span className={classes.chipName}>{connection.name}</span>
                  </UnstyledButton>
                ))}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <ConnectionModal connection={selected} onClose={() => setSelected(null)} onAdd={(id) => addUsers([id])} />
    </AppLayout>
  );
}
