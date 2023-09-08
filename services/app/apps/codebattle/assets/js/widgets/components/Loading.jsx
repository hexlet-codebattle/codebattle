import React from 'react';

import ReactLoading from 'react-loading';

const getSize = ({ adaptive = false, small = false }) => {
  switch (true) {
    case adaptive:
      return 16;
    case small:
      return 30;
    default:
      return 50;
  }
};

function Loading(params) {
  const size = getSize(params);
  return (
    <div className="d-flex my-0 py-1 justify-content-center">
      <ReactLoading color="#6c757d" height={size} type="spin" width={size} />
    </div>
  );
}

export default Loading;
