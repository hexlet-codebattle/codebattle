import { ActionIcon, Menu, Tooltip } from '@mantine/core';
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
 * GameBanPlayerButton): the opponent and admins can report them; admins can ban or
 * release them in a tournament game.
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

  const toggleBan = () =>
    push('user:ban', { user_id: player.id, tournament_id: game.tournament_id })
      .then(() => notifications.show({ message: player.is_banned ? t('Player released') : t('Player banned') }))
      .catch(() => notifications.show({ color: 'red', message: t('Could not change the ban') }));

  return (
    <Menu position="bottom-end" width={200}>
      <Menu.Target>
        <Tooltip label={t('Player actions')}>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('Player actions')}>
            <IconFlag size={14} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {canReport && (
          <Menu.Item leftSection={<IconFlag size={14} />} disabled={reported} onClick={() => void report()}>
            {reported ? t('Reported') : t('Report on player')}
          </Menu.Item>
        )}
        {canBan && (
          <Menu.Item
            color={player.is_banned ? undefined : 'red'}
            leftSection={player.is_banned ? <IconLockOpen size={14} /> : <IconBan size={14} />}
            onClick={() => void toggleBan()}
          >
            {player.is_banned ? t('Release') : t('Ban player')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
