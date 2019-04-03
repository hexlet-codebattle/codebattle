import React from 'react';

export default ({ closeToast }) => {
  const btnStyle = {
    position: 'absolute',
    top: '5px',
    right: '10px',
  };
  return (
    <button
      type="button"
      onClick={closeToast}
      className="ml-2 mb-1 close"
      aria-label="Close"
      style={btnStyle}
    >
      <span aria-hidden="true">&times;</span>
    </button>
  );
};
