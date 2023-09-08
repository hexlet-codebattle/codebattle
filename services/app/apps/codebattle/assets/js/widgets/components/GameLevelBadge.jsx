import React from 'react';

function GameLevelBadge({ level }) {
  return (
    <div className="text-center" data-placement="right" data-toggle="tooltip" title={level}>
      <img alt={level} src={`/assets/images/levels/${level}.svg`} />
    </div>
  );
}

export default GameLevelBadge;
