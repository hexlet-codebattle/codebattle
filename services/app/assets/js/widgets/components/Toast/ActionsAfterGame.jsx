import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import { sendRejectToRematch } from '../../middlewares/Game';
import BackToTournamentButton from './BackToTournamentButton';
import NewGameButton from './NewGameButton';
import RematchButton from './RematchButton';
import BackToHomeButton from './BackToHomeButton';

const handleClick = isRejectRequired => () => {
  if (isRejectRequired) {
    sendRejectToRematch();
  }
  window.location = '/';
};

const ActionsAfterGame = props => {
  const {
    gameStatus: { tournamentId },
  } = props;
  return tournamentId ? (
    <>
      <BackToTournamentButton />
      <BackToHomeButton handleClick={handleClick(false)} />
    </>
  ) : (
    <>
      <NewGameButton />
      <RematchButton />
      <BackToHomeButton handleClick={handleClick(true)} />
    </>
  );
};

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

const mapDispatchToProps = { sendRejectToRematch };

export default connect(mapStateToProps, mapDispatchToProps)(ActionsAfterGame);
