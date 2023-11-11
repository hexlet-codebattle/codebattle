import React, { useMemo, memo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { tournamentSelector } from '@/selectors';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

function TournamentUserGameScore({ userId }) {
  const { type, matches, currentRound } = useSelector(tournamentSelector);
  const roundMatches = useMemo(() => (
    Object.values(matches || {}).filter(match => match.round === currentRound)
  ), [matches, currentRound]);

  const [player, opponent] = useMatchesStatistics(userId, roundMatches);

  if (type !== 'swiss' || roundMatches.length === 0) {
    return null;
  }

  const scoreResultClass = cn('ml-2', {
    'cb-game-score-won': player.score > opponent.score,
    'cb-game-score-lost': player.score < opponent.score,
    'cb-game-score-draw': player.score === opponent.score,
  });

  return (
    <div className={scoreResultClass}>
      Score:
      {player.score}
    </div>
  );
}

export default memo(TournamentUserGameScore);
