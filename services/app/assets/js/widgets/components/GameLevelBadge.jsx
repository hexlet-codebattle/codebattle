import React from 'react';
import getImageUrl from '../utils/assetsUrl';

const GameLevelBadge = ({ level }) => (
  <div
    className="text-center"
    data-toggle="tooltip"
    data-placement="right"
    title={level}
  >
    <img alt={level} src={getImageUrl(`levels/${level}.svg`)} />
  </div>
);

export default GameLevelBadge;
