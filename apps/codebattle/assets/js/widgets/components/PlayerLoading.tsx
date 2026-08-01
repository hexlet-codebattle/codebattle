import React from 'react';

import i18n from '../../i18n';

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
      <span className="sr-only">{i18n.t('Loading...')}</span>
    </div>
  );
}

export default PlayerLoading;
