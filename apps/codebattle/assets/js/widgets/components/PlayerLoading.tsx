import React from 'react';

import { Loader } from '@mantine/core';

import i18n from '../../i18n';

interface PlayerLoadingProps {
  show?: boolean;
  small?: boolean;
}

function PlayerLoading({ small = false, show = false }: PlayerLoadingProps) {
  const size = small ? 30 : 50;
  return (
    <Loader
      className="cb-player-loading"
      size={size}
      color="gray"
      role="status"
      aria-label={i18n.t('Loading...')}
      style={{ visibility: show ? 'visible' : 'hidden' }}
    />
  );
}

export default PlayerLoading;
