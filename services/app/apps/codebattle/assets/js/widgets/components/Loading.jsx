import React from 'react';

const getSize = ({ small = false, large = false, adaptive = false }) => {
  switch (true) {
    case adaptive: return 16;
    case small: return 30;
    case large: return 100;
    default: return 50;
  }
};

function Loading(props) {
  const size = getSize(props);

  return (
    <div className="d-flex my-0 py-1 justify-content-center">
      <div
        className="spinner-border text-secondary"
        style={{ width: `${size}px`, height: `${size}px` }}
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export default Loading;
