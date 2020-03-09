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
    isOpponentInGame,
  } = props;

  const isRematchDisabled = !isOpponentInGame;

  return tournamentId ? (
    <>
      <BackToTournamentButton />
      <BackToHomeButton />
    </>
  ) : (
    <>
      <NewGameButton />
      <RematchButton disabled={isRematchDisabled} />
      <BackToHomeButton />
    </>
  );
};

const mapStateToProps = state => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGame(state),
    gameStatus: selectors.gameStatusSelector(state),
  };
};


export default connect(mapStateToProps)(ActionsAfterGame);
