import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import { sendRejectToRematch } from '../../middlewares/Game';

const handleClick = (isRejectRequired = true) => () => {
  if (isRejectRequired) {
    sendRejectToRematch();
  }
  window.location = '/';
};

const BackToHomeButton = ({ isRejectRequired }) => (
  <button className="btn btn-secondary btn-block" onClick={handleClick(isRejectRequired)} type="button">
    Back to home
  </button>
);

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

export default connect(mapStateToProps)(BackToHomeButton);
