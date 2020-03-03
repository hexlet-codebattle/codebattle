import React from 'react';
import { connect } from 'react-redux';
import { sendRejectToRematch } from '../../middlewares/Game';

const BackToHomeButton = ({ isRejectRequired }) => {
  const handleClick = () => {
    if (isRejectRequired) {
      sendRejectToRematch();
    }
    window.location = '/';
  };

  return (
    <button className="btn btn-secondary btn-block" onClick={handleClick} type="button">
      Back to home
    </button>
  );
};

const mapDispatchToProps = { sendRejectToRematch };

export default connect(null, mapDispatchToProps)(BackToHomeButton);
