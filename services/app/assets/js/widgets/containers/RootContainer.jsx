import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect, useDispatch } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import Gon from 'gon';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import { actions } from '../slices';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector, replayIsShownSelector } from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';

const RootContainer = ({
  storeLoaded,
  gameStatusCode,
  checkResult,
  init,
  setCurrentUser,
  replayIsShown,
}) => {
  const dispatch = useDispatch();

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

  const handleShowReplay = () => {
    dispatch(actions.showPlayer());
  };

  const handleHideReplay = () => {
    dispatch(actions.hidePlayer());
  };

  return (
    <div className="x-outline-none">
      <div className="container-fluid">
        <div className="row no-gutter cb-game">
          <InfoWidget />
          <GameWidget />
        </div>
        <button
          type="button"
          className="btn btn-info"
          onClick={replayIsShown ? handleHideReplay : handleShowReplay}
        >
          {replayIsShown ? 'Hide replay timeline' : 'Show replay timeline'}
        </button>
      </div>
      {replayIsShown && <CodebattlePlayer />}
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
  replayIsShown: replayIsShownSelector(state),
});

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  init: GameActions.init,
  checkResult: GameActions.checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
