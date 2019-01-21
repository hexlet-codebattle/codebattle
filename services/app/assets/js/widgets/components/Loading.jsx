import React from 'react';
import ReactLoading from 'react-loading';

export default ({ small }) => {
  const size = small ? 30 : 50;
  return (
    <div className="d-flex my-0 py-1 justify-content-center">
      <ReactLoading type="spin" color="#6c757d" height={size} width={size} />
    </div>
  );
};
