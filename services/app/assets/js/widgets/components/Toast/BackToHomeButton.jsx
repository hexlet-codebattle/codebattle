import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import { sendRejectToRematch } from '../../middlewares/Game';

const handleClick = () => {
  sendRejectToRematch();
  window.location = '/';
};

const BackToHomeButton = () => (
  <button className="btn btn-secondary btn-block" onClick={handleClick} type="button">
    Back to home
  </button>
);

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

export default connect(mapStateToProps)(BackToHomeButton);
