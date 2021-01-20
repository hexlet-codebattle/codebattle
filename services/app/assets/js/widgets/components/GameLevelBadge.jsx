import React from 'react';

const GameLevelBadge = ({ level }) => (
  <div
    className="text-center"
    data-toggle="tooltip"
    data-placement="right"
    title={level}
  >
    <img alt={level} src={`/assets/images/levels/${level}.svg`} />
  </div>
);

export default GameLevelBadge;
