import React, { memo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { userGameScoreSelector } from '../../selectors';

function UserGameScore({ userId }) {
  const { winnerId, results } = useSelector(userGameScoreSelector);

  const showScore = Object.values(results).reduce((acc, score) => acc + Number(score), 0) > 0;

  if (!showScore) {
    return null;
  }

  const score = results[userId];
  const scoreResultClass = cn('ml-2', {
    'cb-game-score-won': winnerId === userId,
    'cb-game-score-lost': winnerId !== null && winnerId !== userId,
    'cb-game-score-draw': winnerId === null,
  });

  return (
    <div className={scoreResultClass}>
      Score:
      {score}
    </div>
  );
}

export default memo(UserGameScore);
