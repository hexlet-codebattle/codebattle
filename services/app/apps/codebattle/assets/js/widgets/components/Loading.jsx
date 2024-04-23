import React from 'react';

import ReactLoading from 'react-loading';

const getSize = ({ small = false, large = false, adaptive = false }) => {
  switch (true) {
    case adaptive: return 16;
    case small: return 30;
    case large: return 100;
    default: return 50;
  }
};

const Loading = params => {
  const size = getSize(params);

  return (
    <div className="d-flex my-0 py-1 justify-content-center">
      <ReactLoading type="spin" color="#6c757d" height={size} width={size} />
    </div>
  );
};

export default Loading;
