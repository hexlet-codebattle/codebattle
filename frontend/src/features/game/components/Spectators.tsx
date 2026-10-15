import { Avatar, Tooltip } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { usePresenceStore } from '@/features/presence/store';
import { UserCard } from '@/features/users/UserCard';
import { UserAvatar } from '@/shared/UserAvatar';

import classes from '../GameRoom.module.css';

const SHOWN_AVATARS = 4;

/** Signed-in users on this game's page who don't play in it (guests aren't in presence). */
function useSpectators(gameId: number, playerIds: number[]) {
  const link = `/games/${gameId}`;
  return usePresenceStore(
    useShallow((state) => state.users.filter((user) => user.link === link && !user.is_bot && !playerIds.includes(user.id))),
  );
}

/** Avatars of who watches (each opens their player card) and the count. */
export function Spectators({ gameId, playerIds }: { gameId: number; playerIds: number[] }) {
  const { t } = useTranslation();
  const spectators = useSpectators(gameId, playerIds);
  const shown = spectators.slice(0, SHOWN_AVATARS);
  const rest = spectators.length - shown.length;

  if (spectators.length === 0) {
    return (
      <Tooltip label={t('Nobody is watching yet')}>
        <span className={classes.miniChatWatchers} data-empty>
          <IconEye size={14} />0
        </span>
      </Tooltip>
    );
  }

  return (
    <div className={classes.miniChatWatchers}>
      <Avatar.Group spacing={6}>
        {shown.map((user) => (
          <UserCard key={user.id} user={user}>
            <UserAvatar user={user} size={20} radius="xl" />
          </UserCard>
        ))}
        {rest > 0 && (
          <Tooltip label={spectators.slice(SHOWN_AVATARS).map((user) => user.name).join(', ')} multiline maw={260}>
            <Avatar size={20} radius="xl">
              +{rest}
            </Avatar>
          </Tooltip>
        )}
      </Avatar.Group>
      <Tooltip label={t('Spectators: %{count}', { count: spectators.length })}>
        <span className={classes.miniChatWatchCount}>
          <IconEye size={14} />
          {spectators.length}
        </span>
      </Tooltip>
    </div>
  );
}
