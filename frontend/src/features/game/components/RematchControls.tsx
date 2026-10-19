import { ActionIcon, Button, Group, Paper, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '../store';
import type { Game } from '../types';
import type { GameApi } from '../useGame';
import classes from '../GameRoom.module.css';

interface RematchControlsProps {
  game: Game;
  api: GameApi;
  me: number;
  /**
   * "bar" for the top bar, "banner" for the game-over strip (as the bar, without the pulse),
   * "modal" for the game-over modal (bigger, with the opponent's name).
   */
  variant?: 'bar' | 'banner' | 'modal';
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
    // The banner says who offers and flashes itself, so it only needs the two buttons.
    if (variant === 'banner') {
      return (
        <Group gap={6} wrap="nowrap">
          <Button size="compact-sm" variant="filled" color="green" leftSection={<IconRefresh size={14} />} onClick={api.acceptRematch}>
            {t('Accept')}
          </Button>
          <Button size="compact-sm" onClick={api.rejectRematch}>
            {t('Decline')}
          </Button>
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
        <Text size="sm" fw={700} className={modal ? undefined : classes.rematchOfferLabel} truncate>
          {modal && opponent ? t('%{name} offers a rematch', { name: opponent.name }) : t('Rematch?')}
        </Text>
        {modal ? (
          <Group gap="xs" wrap="nowrap">
            <Button size="sm" variant="filled" color="green" leftSection={<IconRefresh size={16} />} onClick={api.acceptRematch}>
              {t('Accept')}
            </Button>
            <Button size="sm" variant="subtle" color="gray" onClick={api.rejectRematch}>
              {t('Decline')}
            </Button>
          </Group>
        ) : (
          <>
            <Button size="compact-sm" variant="filled" color="green" leftSection={<IconRefresh size={14} />} onClick={api.acceptRematch}>
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

  // Same green call to action as the tournament "Next game" button in the bar.
  const button = (
    <Button
      size={modal ? 'sm' : 'compact-sm'}
      variant="filled"
      color="green"
      leftSection={<IconRefresh size={modal ? 16 : 14} className={classes.rematchIcon} />}
      className={classes.rematchButton}
      data-variant={variant}
      onClick={api.sendRematch}
    >
      {t('Rematch')}
    </Button>
  );

  return !modal && opponent ? (
    <Tooltip label={t('Offer %{name} a rematch', { name: opponent.name })} openDelay={300}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

/**
 * After a casual game, a strip above the task says a rematch is possible: the top-bar button
 * alone went unnoticed. The controls stay in sync with the bar and the game-over modal.
 */
export function RematchBanner({ game, api, me }: Omit<RematchControlsProps, 'variant'>) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const opponent = useGameStore((state) => Object.values(state.players).find((player) => player.id !== me));

  if (dismissed || !opponent || game.rematch_state === 'rejected' || game.rematch_state === 'accepted') return null;
  const incoming = game.rematch_state === 'in_approval' && game.rematch_initiator_id !== me;

  return (
    <Paper p="xs" px="sm" className={classes.rematchBanner} data-incoming={incoming || undefined} role="region" aria-label={t('Rematch')}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <ThemeIcon variant="light" color={incoming ? 'red' : 'green'} size="lg" radius="xl">
            <IconRefresh size={18} />
          </ThemeIcon>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={700} truncate>
              {incoming ? t('%{name} offers a rematch', { name: opponent.name }) : t('Want another round?')}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {incoming
                ? t('A new task against the same opponent, it starts once you accept.')
                : opponent.is_bot
                  ? t('Rematch %{name} on a new task, it starts right away.', { name: opponent.name })
                  : t('Rematch %{name} on a new task, they get an offer to accept.', { name: opponent.name })}
            </Text>
          </div>
        </Group>
        <Group gap={6} wrap="nowrap">
          <RematchControls game={game} api={api} me={me} variant="banner" />
          <Tooltip label={t('Hide')}>
            <ActionIcon size="sm" onClick={() => setDismissed(true)} aria-label={t('Hide')}>
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
}
