import React from 'react';

import cn from 'classnames';

import PlayerLoading from '../../components/PlayerLoading';

export const getPregressbarClass = (player) => cn('cb-check-result-bar shadow-sm mt-1', player.checkResult.status);

export const getPregressbarWidth = (player) => `${
  player.checkResult?.solutionPercentage || ((player.checkResult?.successCount ?? 0) / (player.checkResult?.assertsCount ?? 1)) * 100
}%`;

function GameProgressBar({ player, position }) {
  const positionStyle = position === 'right' ? { right: 0 } : {};

  return (
    <>
      <div className={getPregressbarClass(player)}>
        <div
          className="cb-asserts-progress"
          style={{
            width: getPregressbarWidth(player),
            ...positionStyle,
          }}
        />
      </div>
      <PlayerLoading
        show={player.checkResult.status === 'started'}
        small
      />
    </>
  );
}

export default GameProgressBar;
