import { ActionIcon, Badge, Button, Divider, Group, Indicator, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { IconBinoculars, IconPlayerPause, IconPlayerPlay, IconSwords, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import { setFollowPaused, unfollowUser } from '@/features/main/useMainChannel';
import { useFollowStore } from '@/features/main/store';
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

function FollowBar() {
  const { t } = useTranslation();
  const { followId, followName, paused } = useFollowStore();

  if (!followId) return null;

  return (
    <Stack gap={6}>
      <Group gap={6} wrap="nowrap">
        <IconBinoculars size={16} />
        <Text size="sm" truncate>
          {t('You are following %{name}', { name: followName || `#${followId}` })}
        </Text>
      </Group>
      <Group gap={6}>
        <Button
          size="compact-xs"
          leftSection={paused ? <IconPlayerPlay size={12} /> : <IconPlayerPause size={12} />}
          onClick={() => setFollowPaused(!paused)}
        >
          {paused ? t('Resume') : t('Pause')}
        </Button>
        <Button size="compact-xs" color="red" variant="subtle" leftSection={<IconX size={12} />} onClick={unfollowUser}>
          {t('Unfollow')}
        </Button>
      </Group>
    </Stack>
  );
}

/** Header button: pending battle invites (sent and received) plus follow-mode controls. */
export function InvitesMenu() {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const invites = useInvitesStore(useShallow(selectPendingInvites));
  const following = useFollowStore((state) => state.followId != null);
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
        >
          <Tooltip label={t('Invites')}>
            <ActionIcon size="md" aria-label={t('Invites')}>
              {following ? <IconBinoculars size={18} /> : <IconSwords size={18} />}
            </ActionIcon>
          </Tooltip>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <FollowBar />
          {following && <Divider />}
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
