import React from 'react';

import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import {
  currentUserIdSelector,
  gamePlayersSelector,
  gameStatusSelector,
  tournamentSelector,
} from '@/selectors';

import TournamentRoundClock from '../../components/TournamentRoundClock';
import GameStateCodes from '../../config/gameStateCodes';
import TournamentTypes from '../../config/tournamentTypes';
import { type RoundClockInput } from '../../utils/tournamentRoundClock';

interface LadderGameStatusProps {
  isPlaying: boolean;
  // 1-based number of the next round.
  nextRound: number;
  totalRounds: number;
}

// The game runs on its own clock while ladder rounds open on a fixed schedule; tell the
// player how the two relate so the countdown isn't mistaken for their game timer. A round
// only pairs players who are free when it opens, so a game still running skips it.
function LadderGameStatus({ isPlaying, nextRound, totalRounds }: LadderGameStatusProps) {
  const isLastRound = totalRounds > 0 && nextRound > totalRounds;
  const nextIsLast = totalRounds > 0 && nextRound === totalRounds;

  let icon: IconProp = isPlaying ? 'laptop-code' : 'users';
  let text: string;

  if (isLastRound) {
    icon = 'flag-checkered';
    text = isPlaying
      ? i18next.t('Final round — no new pairs after this game')
      : i18next.t('That was your last game in this tournament');
  } else if (isPlaying) {
    text = nextIsLast
      ? i18next.t('Round %{round} is the last one — finish before the countdown ends to play it', {
          round: nextRound,
        })
      : i18next.t('Finish before the countdown ends to play round %{round}', {
          round: nextRound,
        });
  } else {
    text = i18next.t("You'll get a new opponent when round %{round} starts", { round: nextRound });
  }

  return (
    <span className="cb-round-clock-note">
      <FontAwesomeIcon icon={icon} className="cb-round-clock-status-icon" />
      <span>{text}</span>
    </span>
  );
}

// The round clock of the game page side panel: the tournament countdown, the round of the
// viewed game, and — for its players — how their game relates to the next round.
function TournamentGameRoundClock() {
  const gameStatus = useSelector(gameStatusSelector);
  const currentUserId = useSelector(currentUserIdSelector) as number | null;
  const gamePlayers = useSelector(gamePlayersSelector) as Record<number, unknown> | undefined;
  const tournament = useSelector(tournamentSelector) as unknown as RoundClockInput & {
    currentRoundPosition: number;
    gameRoundPosition?: number | null;
    taskIds?: unknown[];
  };

  const totalRounds = tournament.roundsLimit || tournament.taskIds?.length || 0;
  const isGamePlayer = currentUserId != null && !!gamePlayers?.[currentUserId];
  const isPlaying = gameStatus.state === GameStateCodes.playing;

  return (
    <TournamentRoundClock
      compact
      calm={isPlaying}
      gameRoundPosition={tournament.gameRoundPosition}
      gameRoundLabel={isGamePlayer ? i18next.t('Your round') : i18next.t('Game round')}
      tournament={{ ...tournament, roundsLimit: totalRounds }}
    >
      {tournament.type === TournamentTypes.ladder && isGamePlayer && (
        <LadderGameStatus
          isPlaying={isPlaying}
          nextRound={tournament.currentRoundPosition + 2}
          totalRounds={totalRounds}
        />
      )}
    </TournamentRoundClock>
  );
}

export default TournamentGameRoundClock;
