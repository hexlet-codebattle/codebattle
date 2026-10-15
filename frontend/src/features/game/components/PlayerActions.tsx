import { Badge, Button, Group, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBan, IconFlag, IconLockOpen } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMainChannelStore } from '@/features/main/store';
import { useSharedProps } from '@/shared/useSharedProps';

import { useGameStore } from '../store';
import type { GamePlayer } from '../types';

/**
 * Actions on a player from their editor header (legacy GameReportButton /
 * GameBanPlayerButton), as labelled buttons rather than a menu: the opponent and admins
 * can report them; admins can ban or release them in a tournament game.
 */
export function PlayerActions({ player }: { player: GamePlayer }) {
  const { t } = useTranslation();
  const { current_user: me, can_manage_game: canManage } = useSharedProps<{ can_manage_game?: boolean }>();
  const game = useGameStore((state) => state.game);
  const [reported, setReported] = useState(false);
  const push = useMainChannelStore((state) => state.push);

  const iPlay = Boolean(game?.players.some((item) => item.id === me.id));
  const canReport = !player.is_bot && player.id !== me.id && (iPlay || canManage);
  const canBan = Boolean(canManage && game?.tournament_id && !player.is_bot);
  if (!game || (!canReport && !canBan)) return null;

  const report = () =>
    push('game:report', { player_id: player.id, game_id: game.id })
      .then(() => {
        setReported(true);
        notifications.show({ color: 'green', message: t('Report sent, thank you') });
      })
      .catch(() => notifications.show({ color: 'red', message: t('Could not send the report') }));

  // Asks for the wanted state (not a toggle), so a stale button can't flip it the wrong way;
  // the reply carries the result, which this page applies at once (the channel echo may lag).
  const toggleBan = () => {
    const banned = !player.is_banned;
    return push<{ banned: boolean | null }>('user:ban', { user_id: player.id, tournament_id: game.tournament_id, game_id: game.id, banned })
      .then((reply) => {
        const now = reply?.banned ?? banned;
        const players = useGameStore.getState().players;
        const current = players[player.id];
        if (current) useGameStore.getState().setPlayers(Object.values({ ...players, [player.id]: { ...current, is_banned: now } }));
        notifications.show({ message: now ? t('Player banned') : t('Player released') });
      })
      .catch(() => notifications.show({ color: 'red', message: t('Could not change the ban') }));
  };

  return (
    <Group gap={6} wrap="nowrap">
      {canReport && (
        <Tooltip label={t('Report this player for cheating')} disabled={reported}>
          <Button
            size="compact-xs"
            variant="default"
            leftSection={<IconFlag size={13} />}
            disabled={reported}
            onClick={() => void report()}
          >
            {reported ? t('Reported') : t('Report')}
          </Button>
        </Tooltip>
      )}
      {canBan &&
        (player.is_banned ? (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t('Banned in this tournament')}>
              <Badge size="sm" color="red" variant="filled" leftSection={<IconBan size={12} />}>
                {t('Banned')}
              </Badge>
            </Tooltip>
            <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconLockOpen size={13} />} onClick={() => void toggleBan()}>
              {t('Release')}
            </Button>
          </Group>
        ) : (
          <Button size="compact-xs" variant="light" color="red" leftSection={<IconBan size={13} />} onClick={() => void toggleBan()}>
            {t('Ban')}
          </Button>
        ))}
    </Group>
  );
}
