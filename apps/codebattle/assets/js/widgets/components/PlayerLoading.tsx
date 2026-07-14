import React from 'react';

interface PlayerLoadingProps {
  show?: boolean;
  small?: boolean;
}

function PlayerLoading({ small = false, show = false }: PlayerLoadingProps) {
  const size = small ? 30 : 50;
  return (
    <div
      className={`cb-player-loading spinner-border text-secondary ${!show && 'invisible'}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default PlayerLoading;
