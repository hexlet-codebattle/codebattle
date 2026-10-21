import { ActionIcon, Badge, Button, Group, Indicator, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import { useSharedProps } from '@/shared/useSharedProps';

import { acceptInvite, cancelInvite } from './actions';
import { type Invite, selectPendingInvites, useInvitesStore } from './store';

function InviteRow({ invite, userId }: { invite: Invite; userId: number }) {
  const { t } = useTranslation();
  const incoming = invite.recipient_id === userId;
  const level = invite.game_params?.level;

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="xs" wrap="nowrap" miw={0}>
        {level && (
          <Badge size="xs" variant="light" color={LEVEL_COLORS[level]}>
            {levelLabel(level)}
          </Badge>
        )}
        <Text size="sm" truncate>
          {incoming
            ? t('%{name} invites you', { name: invite.creator?.name ?? '' })
            : t('You invited %{name}', { name: invite.recipient?.name ?? '' })}
        </Text>
      </Group>
      <Group gap={4} wrap="nowrap">
        {incoming && (
          <Button size="compact-xs" variant="filled" color="green" onClick={() => acceptInvite(invite.id)}>
            {t('Accept')}
          </Button>
        )}
        <Button size="compact-xs" onClick={() => cancelInvite(invite.id)}>
          {incoming ? t('Decline') : t('Cancel')}
        </Button>
      </Group>
    </Group>
  );
}

/** Header button: pending battle invites (sent and received). */
export function InvitesMenu() {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const invites = useInvitesStore(useShallow(selectPendingInvites));
  const incoming = invites.filter((invite) => invite.recipient_id === user.id).length;

  return (
    <Popover position="bottom-end" width={340} shadow="md">
      <Popover.Target>
        <Indicator
          label={invites.length}
          size={16}
          color={incoming ? 'red' : 'slate'}
          disabled={invites.length === 0}
          offset={4}
          withBorder
        >
          <Tooltip label={t('Invites')}>
            {/* Outlined like its header neighbours; filled red while someone waits for my answer. */}
            <ActionIcon
              size="md"
              variant={incoming ? 'filled' : invites.length ? 'light' : 'default'}
              color={incoming ? 'red' : invites.length ? 'green' : 'gray'}
              aria-label={t('Invites')}
            >
              <IconSwords size={18} />
            </ActionIcon>
          </Tooltip>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          {invites.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={4}>
              {t('No invites. Hover a player to invite them to a battle.')}
            </Text>
          ) : (
            invites.map((invite) => <InviteRow key={invite.id} invite={invite} userId={user.id} />)
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
