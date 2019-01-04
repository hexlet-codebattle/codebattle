import React from 'react';
import GameStatusCodes from '../config/gameStatusCodes';

export default ({ winnerId, gameStatus, userId }) => {
  if (gameStatus === GameStatusCodes.gameOver && winnerId === userId) {
    return <div><i className="fa fa-trophy fa-lg text-warning" aria-hidden="true" /></div>;
  }

  return null;
};
