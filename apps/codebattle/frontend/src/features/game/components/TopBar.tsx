import { ActionIcon, Badge, Button, Group, Indicator, Text, Tooltip } from '@mantine/core';
import { useFullscreenDocument } from '@mantine/hooks';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowRight,
  IconHistory,
  IconPlayerPlay,
  IconMaximize,
  IconMinimize,
  IconRefresh,
  IconLayoutNavbarCollapse,
  IconLayoutNavbarExpand,
  IconMessages,
  IconTrophy,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import logo from '@/assets/logo.svg?raw';
import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { UserMenu } from '@/layout/AppLayout';
import { ColorSchemeToggle } from '@/layout/ColorSchemeToggle';
import { SoundToggle } from '@/layout/SoundToggle';
import { useSharedProps } from '@/shared/useSharedProps';

import { isGameOver, useGameStore } from '../store';
import type { Game, GamePlayer } from '../types';
import type { GameApi } from '../useGame';
import classes from '../GameRoom.module.css';

import { GameTimer } from './GameTimer';

/** Rematch offer / answer for casual games. */
function Rematch({ game, api, me }: { game: Game; api: GameApi; me: number }) {
  const { t } = useTranslation();

  if (game.rematch_state === 'in_approval') {
    if (game.rematch_initiator_id === me) {
      return (
        <Text size="xs" c="dimmed">
          {t('Rematch offered, waiting…')}
        </Text>
      );
    }
    return (
      <Group gap={6} wrap="nowrap">
        <Text size="xs" fw={600}>
          {t('Rematch?')}
        </Text>
        <Button size="compact-xs" color="green" onClick={api.acceptRematch}>
          {t('Accept')}
        </Button>
        <ActionIcon size="sm" variant="subtle" color="gray" onClick={api.rejectRematch} aria-label={t('Decline')}>
          <IconX size={14} />
        </ActionIcon>
      </Group>
    );
  }

  if (game.rematch_state === 'rejected') {
    return (
      <Text size="xs" c="dimmed">
        {t('Rematch declined')}
      </Text>
    );
  }

  return (
    <Button size="compact-xs" variant="default" leftSection={<IconRefresh size={13} />} onClick={api.sendRematch}>
      {t('Rematch')}
    </Button>
  );
}

/** Replaces the timer once the game is over: the outcome for me, and what to do next. */
function Outcome({ game, api, mePlayer }: { game: Game; api: GameApi | null; mePlayer: GamePlayer | undefined }) {
  const { t } = useTranslation();
  const activeGameId = useGameStore((state) => state.activeGameId);
  const waitType = useGameStore((state) => state.waitType);
  const tournament = useGameStore((state) => state.tournament);

  const outcome = mePlayer?.result;
  const label =
    outcome === 'won'
      ? t('You won!')
      : outcome === 'lost'
        ? t('You lost')
        : outcome === 'gave_up'
          ? t('You gave up')
          : game.state === 'timeout'
            ? t('Time is over')
            : t('Game over');
  const color = outcome === 'won' ? 'green' : outcome === 'lost' || outcome === 'gave_up' ? 'red' : 'gray';

  return (
    <Group gap="sm" wrap="nowrap" className={classes.outcome} data-outcome={color}>
      <Badge size="lg" color={color} variant="light" leftSection={outcome === 'won' ? <IconTrophy size={14} /> : null}>
        {mePlayer ? label : game.state === 'timeout' ? t('Time is over') : t('Game over')}
      </Badge>
      <GameTimer game={game} />
      {tournament ? (
        <>
          {waitType === 'round' && (
            <Text size="xs" c="dimmed" visibleFrom="md">
              {t('Round is over, wait for the next round')}
            </Text>
          )}
          {waitType === 'tournament' && (
            <Text size="xs" c="dimmed" visibleFrom="md">
              {t('That was your last game in this tournament')}
            </Text>
          )}
          {activeGameId && activeGameId !== game.id && (
            <Button component="a" href={`/games/${activeGameId}`} size="compact-xs" color="green" rightSection={<IconArrowRight size={13} />}>
              {t('Next game')}
            </Button>
          )}
        </>
      ) : (
        mePlayer && api && <Rematch game={game} api={api} me={mePlayer.id} />
      )}
    </Group>
  );
}

/** Head-to-head: all-time wins of the two players against each other. */
function HeadToHeadScore({ game, left, right }: { game: Game; left: GamePlayer; right: GamePlayer }) {
  const { t } = useTranslation();
  const wins = (id: number) => game.head_to_head?.players.find((player) => player.id === id)?.wins;
  const a = wins(left.id);
  const b = wins(right.id);
  if (a == null || b == null || a + b === 0) return null;

  return (
    <Tooltip label={t('Wins against each other')}>
      <span className={classes.h2h}>
        <b data-lead={a > b || undefined}>{a}</b>:<b data-lead={b > a || undefined}>{b}</b>
      </span>
    </Tooltip>
  );
}

interface TopBarProps {
  game: Game;
  /** Null in history mode: no rematch or next game. */
  api: GameApi | null;
  left: GamePlayer | undefined;
  right: GamePlayer | undefined;
  /** The task / tournament strip under the bar. */
  brief: { open: boolean; toggle: () => void };
  /** The chat drawer, when the game has a chat. */
  chat?: { unread: number; open: () => void } | null;
  /** A finished game replayed from its record: always shown as over. */
  history?: boolean;
  /** The replay of this finished game ("Open history"). */
  historyHref?: string | null;
  /** Back from the replay to the game, while it still runs. */
  liveHref?: string | null;
}

export function TopBar({ game, api, left, right, brief, chat = null, history = false, historyHref = null, liveHref = null }: TopBarProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const { toggle, fullscreen } = useFullscreenDocument();
  const over = history || isGameOver(game.state);
  const back = game.tournament_id
    ? { href: `/tournaments/${game.tournament_id}`, label: t('Back to tournament'), short: t('Tournament'), icon: <IconTrophy size={15} /> }
    : { href: '/', label: t('Back to lobby'), short: t('Lobby'), icon: <IconArrowBackUp size={15} /> };
  const task = game.task;

  return (
    <header className={classes.topBar}>
      <Group gap="sm" wrap="nowrap" miw={0} className={classes.topLeft}>
        <a href="/" className={classes.logo} aria-label="Codebattle" dangerouslySetInnerHTML={{ __html: logo }} />
        <Button
          component="a"
          href={back.href}
          size="compact-sm"
          variant="default"
          leftSection={<IconArrowLeft size={14} />}
          rightSection={back.icon}
          aria-label={back.label}
          className={classes.backButton}
        >
          <Text span size="xs" fw={700} visibleFrom="lg">
            {back.label}
          </Text>
          <Text span size="xs" fw={700} hiddenFrom="lg">
            {back.short}
          </Text>
        </Button>
        {task && (
          <Tooltip label={brief.open ? t('Hide the task') : t('Show the task')}>
            <Button
              size="compact-sm"
              variant="subtle"
              color="gray"
              onClick={brief.toggle}
              aria-pressed={brief.open}
              rightSection={brief.open ? <IconLayoutNavbarCollapse size={15} /> : <IconLayoutNavbarExpand size={15} />}
              className={classes.taskToggle}
            >
              <Group gap={8} wrap="nowrap" miw={0}>
                <Badge size="sm" variant="light" color={LEVEL_COLORS[task.level as GameLevel] ?? 'gray'}>
                  {levelLabel(task.level as GameLevel)}
                </Badge>
                <Text span size="sm" fw={700} c="bright" truncate>
                  {task.name}
                </Text>
              </Group>
            </Button>
          </Tooltip>
        )}
      </Group>

      <div className={classes.topCenter}>
        {over ? <Outcome game={game} api={api} mePlayer={game.players.find((player) => player.id === me.id)} /> : <GameTimer game={game} />}
        {left && right && <HeadToHeadScore game={game} left={left} right={right} />}
        {historyHref && (
          <Button component="a" href={historyHref} size="compact-xs" variant="default" leftSection={<IconHistory size={13} />}>
            {t('Open history')}
          </Button>
        )}
        {liveHref && (
          <Button component="a" href={liveHref} size="compact-xs" variant="default" leftSection={<IconPlayerPlay size={13} />}>
            {t('Back to game')}
          </Button>
        )}
      </div>

      <Group gap={6} wrap="nowrap" justify="flex-end" className={classes.topRight}>
        {chat && (
          <Tooltip label={t('Chat')}>
            <Indicator label={chat.unread > 99 ? '99+' : chat.unread} size={16} color="red" disabled={chat.unread === 0} offset={4}>
              <ActionIcon size="md" variant="default" onClick={chat.open} aria-label={t('Chat')}>
                <IconMessages size={16} />
              </ActionIcon>
            </Indicator>
          </Tooltip>
        )}
        <SoundToggle />
        <ColorSchemeToggle />
        <Tooltip label={fullscreen ? t('Exit full screen') : t('Full screen')}>
          <ActionIcon size="md" variant="default" onClick={() => void toggle()} aria-label={t('Full screen')} visibleFrom="sm">
            {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
          </ActionIcon>
        </Tooltip>
        {/* Who you are here, as in the site header. */}
        <UserMenu compact />
      </Group>
    </header>
  );
}
