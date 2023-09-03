import React from 'react';

import ReactLoading from 'react-loading';

const PlayerLoading = ({ small = false, show = false }) => {
  const size = small ? 30 : 50;
  return (
    <ReactLoading className={`cb-player-loading ${!show && 'invisible'}`} type="spin" color="#6c757d" height={size} width={size} />
  );
};

export default PlayerLoading;
