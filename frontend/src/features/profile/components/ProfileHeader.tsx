import { ActionIcon, Anchor, Button, Card, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconBinoculars, IconBinocularsFilled, IconBrandGithub, IconEye, IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useInviteDialog } from '@/features/invites/dialog';
import { followUser, unfollowUser } from '@/features/main/useMainChannel';
import { useFollowStore } from '@/features/main/store';
import { usePresenceStore } from '@/features/presence/store';
import { PRESENCE_LABELS } from '@/features/users/achievements';
import { getLocale } from '@/i18n';
import { parseServerDate } from '@/shared/date';
import { formatAgo } from '@/shared/formatAgo';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';

import type { ProfileStats } from '../api';

import classes from './Profile.module.css';

const joinedFormat = () => new Intl.DateTimeFormat(getLocale(), { year: 'numeric', month: 'long', day: 'numeric' });

/** Avatar, identity, status and the Invite / Watch / Follow actions. */
export function ProfileHeader({ profile }: { profile: ProfileStats }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const { user, active_game_id: activeGameId, last_active_at: lastActive } = profile;
  const presence = usePresenceStore((state) => state.users.find(({ id }) => id === user.id));
  const followId = useFollowStore((state) => state.followId);
  const openInvite = useInviteDialog((state) => state.open);

  const self = me.id === user.id;
  const following = followId === user.id;
  const ago = lastActive ? formatAgo(lastActive, { recentSeconds: 5 * 60 }) : null;
  const status = presence
    ? t(PRESENCE_LABELS[presence.state] ?? 'Online')
    : lastActive
      ? ago
        ? t('Seen %{when}', { when: ago })
        : t('Seen recently')
      : t('Offline');

  return (
    <Card padding="lg">
      <Stack gap="md" align="center" ta="center">
        <UserAvatar user={user} size={112} />
        <Stack gap={4} align="center" maw="100%">
          <Group gap={8} wrap="nowrap" maw="100%">
            <LangIcon lang={user.lang} size={24} />
            <Title order={2} className={classes.name}>
              {user.name}
            </Title>
          </Group>
          {user.clan ? (
            user.clan_id ? (
              <Anchor href={`/clans/${user.clan_id}`} size="sm" fw={600}>
                {user.clan}
              </Anchor>
            ) : (
              <Text size="sm" fw={600}>
                {user.clan}
              </Text>
            )
          ) : (
            <Text size="sm" c="dimmed">
              {t('No clan')}
            </Text>
          )}
          <Group gap={6} wrap="nowrap" justify="center">
            <span className={classes.dot} data-online={presence ? true : undefined} />
            <Text size="xs" c="dimmed">
              {status}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t('joined at %{date}', { date: joinedFormat().format(parseServerDate(user.inserted_at)) })}
          </Text>
          {user.github_name && (
            <Anchor
              href={`https://github.com/${user.github_name}`}
              target="_blank"
              rel="noreferrer"
              size="xs"
              c="dimmed"
              className={classes.github}
            >
              <IconBrandGithub size={14} />
              {user.github_name}
            </Anchor>
          )}
        </Stack>

        {!self && !user.is_bot && (
          <Group gap={6} wrap="nowrap" w="100%">
            <Button
              flex={1}
              variant="filled"
              color="green"
              leftSection={<IconSwords size={16} />}
              onClick={() => openInvite({ id: user.id, name: user.name })}
            >
              {t('Invite to battle')}
            </Button>
            <Tooltip label={activeGameId ? t('Watch the game') : t('Not in a game')}>
              <ActionIcon
                size={36}
                component="a"
                href={activeGameId ? `/games/${activeGameId}` : undefined}
                disabled={!activeGameId}
                aria-label={t('Watch the game')}
              >
                <IconEye size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={following ? t('Unfollow') : t('Follow: open their games automatically')}>
              <ActionIcon
                size={36}
                variant={following ? 'light' : 'default'}
                onClick={() => (following ? unfollowUser() : void followUser({ id: user.id, name: user.name }))}
                aria-label={following ? t('Unfollow') : t('Follow')}
              >
                {following ? <IconBinocularsFilled size={18} /> : <IconBinoculars size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
