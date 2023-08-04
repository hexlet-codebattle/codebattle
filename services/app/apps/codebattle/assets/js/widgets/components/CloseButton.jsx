import React from 'react';

const CloseButton = ({ closeToast }) => (
  <button
    type="button"
    onClick={closeToast}
    className="ml-2 mb-1 close position-absolute cb-toast-close rounded-lg"
    aria-label="Close"
  >
    <span aria-hidden="true">&times;</span>
  </button>
);

export default CloseButton;
