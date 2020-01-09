import React from 'react';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import BackToTournamentButton from './BackToTournamentButton';
import NewGameButton from './NewGameButton';
import RematchButton from './RematchButton';

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
    </>
  );
};

const mapStateToProps = state => ({
  gameStatus: selectors.gameStatusSelector(state),
});

export default connect(mapStateToProps)(ActionsAfterGame);
