import { Badge, Group, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconSwords, IconTrophy } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { OnlineUser, PresenceState } from '@/features/presence/store';
import { usePresenceStore } from '@/features/presence/store';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';

import type { ChatUserRef } from '../types';

import classes from './OnlinePlayers.module.css';

// Labels are i18n keys.
const GROUPS: { state: PresenceState; label: string }[] = [
  { state: 'playing', label: 'In a game' },
  { state: 'watching', label: 'Watching' },
  { state: 'tournament', label: 'In tournament' },
  { state: 'lobby', label: 'Lobby' },
  { state: 'task', label: 'Editing a task' },
  { state: 'online', label: 'Online' },
];

/** "/games/12" → { kind: 'game', id: '12' } */
const parseActivity = (link: string | null) => {
  const match = link?.match(/^\/(games|tournaments)\/(\d+)/);
  return match ? { kind: match[1] === 'games' ? ('game' as const) : ('tournament' as const), id: match[2] } : null;
};

/** Small "🏆 #5208" / "⚔ #177" pill linking to where the player is. */
function ActivityPill({ link }: { link: string | null }) {
  const { t } = useTranslation();
  const activity = parseActivity(link);
  if (!activity) return null;

  const Icon = activity.kind === 'game' ? IconSwords : IconTrophy;
  const label = activity.kind === 'game' ? t('game #%{id}', { id: activity.id }) : t('tournament #%{id}', { id: activity.id });

  return (
    <Tooltip label={label} openDelay={300}>
      <a href={link!} className={classes.pill} aria-label={label}>
        <Icon size={12} />#{activity.id}
      </a>
    </Tooltip>
  );
}

function OnlineUserRow({ user, onDirectMessage }: { user: OnlineUser; onDirectMessage: (user: ChatUserRef) => void }) {
  return (
    <div className={classes.row}>
      <LangIcon lang={user.lang} size={18} />
      <UserCard user={user} onDirectMessage={onDirectMessage}>
        <Text span size="sm" c="bright" truncate display="block">
          {user.name}
        </Text>
      </UserCard>
      <ActivityPill link={user.link} />
    </div>
  );
}

/** Who is online, grouped by what they're doing; the side panel of the lobby chat. */
export function OnlinePlayers({ onDirectMessage }: { onDirectMessage: (user: ChatUserRef) => void }) {
  const { t } = useTranslation();
  const users = usePresenceStore((state) => state.users);
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({ ...group, users: users.filter((user) => user.state === group.state) })).filter(
        (group) => group.users.length > 0,
      ),
    [users],
  );

  return (
    <div className={classes.panel}>
      <Group justify="space-between" px="md" className={classes.header} wrap="nowrap">
        <Group gap={8}>
          <span className={classes.liveDot} />
          <Text fw={600} c="bright" size="sm">
            {t('Online now')}
          </Text>
        </Group>
        <Badge variant="default">{users.length}</Badge>
      </Group>
      <ScrollArea flex={1} type="auto">
        <Stack gap="md" px="xs" py="sm">
          {groups.map((group) => (
            <Stack key={group.state} gap={2}>
              <Group gap={6} px={8} pb={2}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts="0.05em">
                  {t(group.label)}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {group.users.length}
                </Text>
              </Group>
              {group.users.map((user) => (
                <OnlineUserRow key={user.id} user={user} onDirectMessage={onDirectMessage} />
              ))}
            </Stack>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
