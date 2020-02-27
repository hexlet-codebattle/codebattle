import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import BackToTournamentButton from './BackToTournamentButton';
import NewGameButton from './NewGameButton';
import RematchButton from './RematchButton';
import BackToHomeButton from './BackToHomeButton';

const ActionsAfterGame = props => {
  const {
    gameStatus: { tournamentId },
  } = props;
  return tournamentId ? (
    <BackToTournamentButton />
  ) : (
    <>
      <NewGameButton />
      <RematchButton />
      <BackToHomeButton />
    </>
  );
};

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

export default connect(mapStateToProps)(ActionsAfterGame);
