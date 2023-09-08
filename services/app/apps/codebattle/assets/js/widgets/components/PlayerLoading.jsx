import React from 'react';

import ReactLoading from 'react-loading';

function PlayerLoading({ show = false, small = false }) {
  const size = small ? 30 : 50;
  return (
    <ReactLoading
      className={`cb-player-loading ${!show && 'invisible'}`}
      color="#6c757d"
      height={size}
      type="spin"
      width={size}
    />
  );
}

export default PlayerLoading;
