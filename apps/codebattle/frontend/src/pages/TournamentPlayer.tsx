import { Loader, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSpectatorPrefs } from '@/features/tournamentPlayer/prefs';
import { type SpectatorMode, SpectatorGame } from '@/features/tournamentPlayer/SpectatorGame';
import { Toolbar } from '@/features/tournamentPlayer/Toolbar';
import classes from '@/features/tournamentPlayer/TournamentPlayer.module.css';
import { useSpectator } from '@/features/tournamentPlayer/useSpectator';
import { useSharedProps } from '@/shared/useSharedProps';

interface Props {
  tournament_id: number;
  player_id: number;
  player_name?: string;
}

/** `?editor`: the code alone; `?timer`: the clock alone; otherwise task, tests and code. */
function parseMode(search: string): SpectatorMode {
  const params = new URLSearchParams(search);
  if (params.has('editor')) return 'editor';
  if (params.has('timer')) return 'timer';
  return 'full';
}

/**
 * `/tournaments/:id/player/:player_id`: follows one tournament player from game to game,
 * full-window (for screens and streams). Each new game of theirs replaces the last one.
 */
export default function TournamentPlayer() {
  const { t } = useTranslation();
  const { tournament_id: tournamentId, player_id: playerId, player_name: playerName = null } = useSharedProps<Props>();
  const mode = useMemo(() => parseMode(window.location.search), []);
  const prefs = useSpectatorPrefs();
  const { gameId, tournamentState, joined, failed } = useSpectator(playerId, tournamentId);

  useEffect(() => {
    document.title = playerName ? `${playerName} · ${t('Live')} · Codebattle` : 'Codebattle';
  }, [playerName, t]);

  const tournamentStatus: Record<string, string> = {
    finished: t('Tournament is finished'),
    waiting_participants: t('Tournament is waiting to start'),
    canceled: t('Tournament is canceled'),
  };
  const status = tournamentState ? tournamentStatus[tournamentState] : undefined;

  if (!status && gameId) {
    // A new game remounts the view (fresh store, its own channel).
    return <SpectatorGame key={gameId} gameId={gameId} playerId={playerId} tournamentId={tournamentId} playerName={playerName} mode={mode} prefs={prefs} />;
  }

  // The clock alone shows nothing between games.
  if (mode === 'timer') return <div className={classes.screen} />;

  const message = status ?? (joined ? t("Waiting for the player's next game") : failed ? t('Could not connect to the tournament, retrying…') : null);

  return (
    <div className={classes.screen}>
      <Toolbar tournamentId={tournamentId} playerName={playerName} prefs={prefs} withEditorControls={false} />
      <div className={classes.status}>
        {message ? (
          <Text fw={800} size="xl" tt="uppercase" lts="0.08em">
            {message}
          </Text>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
}
