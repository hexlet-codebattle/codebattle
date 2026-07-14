import React from 'react';

interface GameStateBadgeProps {
  state: string;
}

function GameStateBadge({ state }: GameStateBadgeProps) {
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
