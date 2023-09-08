import React from 'react';

function GameStateBadge({ state }) {
  return (
    <img
      alt={state}
      title={state}
      src={
        state === 'playing' ? '/assets/images/playing.svg' : '/assets/images/waitingOpponent.svg'
      }
    />
  );
}

export default GameStateBadge;
