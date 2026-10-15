import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '../store';
import type { Game } from '../types';
import type { GameApi } from '../useGame';
import classes from '../GameRoom.module.css';

interface RematchControlsProps {
  game: Game;
  api: GameApi;
  me: number;
  /** "bar" for the top bar, "modal" for the game-over modal (bigger, with the opponent's name). */
  variant?: 'bar' | 'modal';
}

/**
 * Rematch offer / answer for casual games. The top bar and the game-over modal both render it
 * from the same game state, so answering in one updates the other. An incoming offer glows.
 */
export function RematchControls({ game, api, me, variant = 'bar' }: RematchControlsProps) {
  const { t } = useTranslation();
  const modal = variant === 'modal';
  const opponent = useGameStore((state) => Object.values(state.players).find((player) => player.id !== me));

  if (game.rematch_state === 'in_approval') {
    if (game.rematch_initiator_id === me) {
      return (
        <Group gap={6} wrap="nowrap">
          <Text size={modal ? 'sm' : 'xs'} c="dimmed">
            {t('Rematch offered, waiting…')}
          </Text>
          <Tooltip label={t('Cancel rematch')}>
            <ActionIcon size={modal ? 'md' : 'sm'} variant="subtle" color="gray" onClick={api.cancelRematch} aria-label={t('Cancel rematch')}>
              <IconX size={modal ? 16 : 14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    }
    return (
      <Group
        gap={modal ? 'sm' : 6}
        wrap="nowrap"
        justify={modal ? 'space-between' : undefined}
        w={modal ? '100%' : undefined}
        className={classes.rematchOffer}
        data-variant={variant}
      >
        <Text size="sm" fw={700} truncate>
          {modal && opponent ? t('%{name} offers a rematch', { name: opponent.name }) : t('Rematch?')}
        </Text>
        {modal ? (
          <Group gap="xs" wrap="nowrap">
            <Button size="sm" color="green" leftSection={<IconRefresh size={16} />} onClick={api.acceptRematch}>
              {t('Accept')}
            </Button>
            <Button size="sm" variant="subtle" color="gray" onClick={api.rejectRematch}>
              {t('Decline')}
            </Button>
          </Group>
        ) : (
          <>
            <Button size="compact-sm" color="green" leftSection={<IconRefresh size={14} />} onClick={api.acceptRematch}>
              {t('Accept')}
            </Button>
            <ActionIcon size="md" variant="subtle" color="gray" onClick={api.rejectRematch} aria-label={t('Decline')}>
              <IconX size={16} />
            </ActionIcon>
          </>
        )}
      </Group>
    );
  }

  if (game.rematch_state === 'rejected') {
    return (
      <Text size={modal ? 'sm' : 'xs'} c="dimmed">
        {t('Rematch declined')}
      </Text>
    );
  }

  return (
    <Button
      size={modal ? 'sm' : 'compact-sm'}
      variant={modal ? 'filled' : 'light'}
      color={modal ? 'green' : undefined}
      leftSection={<IconRefresh size={modal ? 16 : 14} />}
      onClick={api.sendRematch}
    >
      {t('Rematch')}
    </Button>
  );
}
