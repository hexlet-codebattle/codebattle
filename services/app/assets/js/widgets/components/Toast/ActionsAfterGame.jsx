import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import BackToTournamentButton from './BackToTournamentButton';
import NewGameButton from './NewGameButton';
import RematchButton from './RematchButton';
import BackToHomeButton from './BackToHomeButton';

const ActionsAfterGame = props => {
  const {
    gameStatus: { tournamentId },
    chatUsers,
    opponentPlayer,
  } = props;

  const isOpponentInGame = () => {
    const findedUser = _.find(chatUsers, { id: opponentPlayer.id });
    return !_.isUndefined(findedUser);
  };

  const isRematchDisabled = !isOpponentInGame();

  return tournamentId ? (
    <>
      <BackToTournamentButton />
      <BackToHomeButton isRejectRequired={false} />
    </>
  ) : (
    <>
      <NewGameButton />
      <RematchButton disabled={isRematchDisabled} />
      <BackToHomeButton isRejectRequired />
    </>
  );
};

const mapStateToProps = state => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    currentUserId,
    opponentPlayer: selectors.opponentPlayerSelector(state),
    chatUsers: selectors.chatUsersSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
  };
};


export default connect(mapStateToProps)(ActionsAfterGame);
