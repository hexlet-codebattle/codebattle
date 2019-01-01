import React from 'react';
import GameStatusCodes from '../config/gameStatusCodes';

export default ({ winner, status }, userId) => {
  if (status === GameStatusCodes.gameOver && winner.id === userId) {
    return <div><i className="fa fa-trophy fa-lg text-warning" aria-hidden="true" /></div>;
  }

  return null;
};
