import { Badge, Loader, Text, useComputedColorScheme } from '@mantine/core';
import { IconFlag, IconTrophyFilled } from '@tabler/icons-react';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditorPane } from '@/features/game/components/EditorPane';
import { GameTimer } from '@/features/game/components/GameTimer';
import { OutputPanel } from '@/features/game/components/OutputPanel';
import { TaskPanel } from '@/features/game/components/TaskPanel';
import { resolveTheme } from '@/features/game/editor/themes';
import { useGameStore } from '@/features/game/store';
import type { GamePlayer } from '@/features/game/types';
import { useGame } from '@/features/game/useGame';
import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { StreamTimer } from '@/features/stream/bodies';

import { AwardModal } from './AwardModal';
import type { SpectatorPrefs } from './prefs';
import { FontControl, Toolbar } from './Toolbar';
import classes from './TournamentPlayer.module.css';

export type SpectatorMode = 'full' | 'editor' | 'timer';

/** Everything the game store holds, emptied: a new game must not show the last one's code. */
const EMPTY_GAME = {
  game: null,
  players: {},
  editors: {},
  checking: {},
  outputs: {},
  message: null,
  tournament: null,
  currentPlayer: null,
  activeGameId: null,
  waitType: null,
};

interface SpectatorGameProps {
  gameId: number;
  playerId: number;
  tournamentId: number;
  playerName: string | null;
  mode: SpectatorMode;
  prefs: SpectatorPrefs;
}

/** The followed player's editor, glowing while their solution is checked, with their result in the corner. */
function PlayerEditor({ player, prefs }: { player: GamePlayer; prefs: SpectatorPrefs }) {
  const { t } = useTranslation();
  const scheme = useComputedColorScheme('dark');
  const checking = useGameStore((state) => Boolean(state.checking[player.id]));
  const result = player.result === 'won' || player.result === 'gave_up' ? player.result : null;

  return (
    <div className={classes.editor} data-checking={checking || undefined}>
      <EditorPane
        player={player}
        editable={false}
        api={null}
        allowClipboard
        fontSize={prefs.editorFont.value}
        theme={resolveTheme(prefs.theme, scheme)}
      />
      {result && (
        <span className={classes.resultIcon} data-result={result} title={result === 'won' ? t('Player won') : t('Player gave up')}>
          {result === 'won' ? <IconTrophyFilled size={56} /> : <IconFlag size={56} />}
        </span>
      )}
    </div>
  );
}

/**
 * One game of the followed player, watched quietly over `game:<id>` (remounted per game).
 * `full`: task and test results beside their editor; `editor`: the editor alone;
 * `timer`: the round clock alone, for a stream overlay.
 */
export function SpectatorGame({ gameId, playerId, tournamentId, playerName, mode, prefs }: SpectatorGameProps) {
  const { t } = useTranslation();

  // Start from a clean store; the join reply fills it.
  useState(() => useGameStore.setState(EMPTY_GAME));
  useGame(gameId, { embedded: true });

  const game = useGameStore((state) => state.game);
  const player = useGameStore((state) => state.players[playerId]);
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));

  if (mode === 'timer') {
    return (
      <div className={classes.screen}>
        {game?.state === 'playing' && (
          <div className={classes.timerOnly}>
            <StreamTimer kiosk />
          </div>
        )}
      </div>
    );
  }

  const gameInfo = game ? (
    <>
      <GameTimer game={game} />
      {game.state !== 'playing' && (
        <Badge variant="light" color="gray" tt="uppercase">
          {game.state}
        </Badge>
      )}
    </>
  ) : null;

  const toolbar = (
    <Toolbar tournamentId={tournamentId} playerName={player?.name ?? playerName} prefs={prefs}>
      {gameInfo}
    </Toolbar>
  );

  if (!game || !player) {
    return (
      <div className={classes.screen}>
        {toolbar}
        <div className={classes.status}>
          {game ? (
            <Text fw={700} size="xl">
              {t('Game is loading')}
            </Text>
          ) : (
            <Loader />
          )}
        </div>
      </div>
    );
  }

  if (mode === 'editor') {
    return (
      <div className={classes.screen}>
        {toolbar}
        <div className={classes.editorOnly}>
          <PlayerEditor player={player} prefs={prefs} />
        </div>
        <AwardModal />
      </div>
    );
  }

  const task = game.task;

  return (
    <div className={classes.screen}>
      {toolbar}
      <div className={classes.body}>
        <div className={classes.side}>
          <section className={`${classes.card} ${classes.taskCard}`}>
            <header className={classes.cardHead}>
              {task && (
                <Badge size="sm" variant="light" color={LEVEL_COLORS[task.level as GameLevel] ?? 'gray'}>
                  {levelLabel(task.level as GameLevel)}
                </Badge>
              )}
              <Text fw={700} c="bright" truncate style={{ flex: 1 }}>
                {task?.name ?? t('Task')}
              </Text>
              {!prefs.hideControls && <FontControl font={prefs.taskFont} label={t('Font size')} />}
            </header>
            <div className={classes.cardBody} style={{ '--task-font-size': `${prefs.taskFont.value}px` } as CSSProperties}>
              {task ? <TaskPanel task={task} /> : <Loader size="sm" />}
            </div>
          </section>
          <section className={`${classes.card} ${classes.outputCard}`}>
            <header className={classes.cardHead}>
              <Text fw={700} c="bright">
                {t('Tests')}
              </Text>
            </header>
            <div className={classes.cardBody}>
              {output || checking ? (
                <OutputPanel output={output} checking={checking} />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('No runs yet')}
                </Text>
              )}
            </div>
          </section>
        </div>
        <PlayerEditor player={player} prefs={prefs} />
      </div>
      <AwardModal />
    </div>
  );
}
