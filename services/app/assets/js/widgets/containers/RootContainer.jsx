import { connect } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';

import Gon from 'gon';

import { actions } from '../slices';
import { gameStatusSelector } from '../selectors';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import userTypes from '../config/userTypes';

const RootContainer = ({
 storeLoaded, gameStatusCode, checkResult, init, setCurrentUser,
}) => {
  useEffect(() => {
    const user = Gon.getAsset('current_user');
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    init();
  }, [init, setCurrentUser]);

  useHotkeys(
    'ctrl+enter, command+enter',
    e => {
      e.preventDefault();
      checkResult();
    },
    [],
    { filter: () => true },
  );

  if (!storeLoaded) {
    // TODO: add loader
    return null;
  }

  if (gameStatusCode === GameStatusCodes.waitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  return (
    <div className="x-outline-none">
      <div className="container-fluid">
        <div className="row no-gutter cb-game">
          <InfoWidget />
          <GameWidget />
        </div>
      </div>
    </div>
  );
};

RootContainer.propTypes = {
  storeLoaded: PropTypes.bool.isRequired,
  setCurrentUser: PropTypes.func.isRequired,
  init: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  storeLoaded: state.storeLoaded,
  gameStatusCode: gameStatusSelector(state).status,
});

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  init: GameActions.init,
  checkResult: GameActions.checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
