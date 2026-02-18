import React from "react";

function GameLevelBadge({ level }) {
  return (
    <div
      className="bg-gray cb-rounded p-1 text-center"
      data-toggle="tooltip"
      data-placement="right"
      title={level}
    >
      <img alt={level} src={`/assets/images/levels/${level}.svg`} />
    </div>
  );
}

export default GameLevelBadge;
