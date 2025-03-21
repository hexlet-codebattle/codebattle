import React, { memo, useMemo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { userGameScoreSelector } from '../../selectors';

function UserGameScore({ userId }) {
  const { winnerId, results } = useSelector(userGameScoreSelector);

  const showScore = useMemo(
    () => Object.values(results).reduce((acc, score) => acc + Number(score), 0) > 0,
    [results],
  );

  if (!showScore) {
    return null;
  }

  const score = results[userId];
  const scoreResultClass = cn('d-flex flex-nowrap ml-2 text-center', {
    'cb-game-score-won': winnerId === userId,
    'cb-game-score-lost': winnerId !== null && winnerId !== userId,
    'cb-game-score-draw': winnerId === null,
  });

  return (
    <div className={scoreResultClass}>
      <span className="d-none d-lg-flex d-md-flex">Score:</span>
      {score}
    </div>
  );
}

export default memo(UserGameScore);
