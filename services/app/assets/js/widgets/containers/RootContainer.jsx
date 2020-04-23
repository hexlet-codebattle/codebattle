import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import Gon from 'gon';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import * as actions from '../actions';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector, replayerModeSelector } from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';
import ReplayerModes from '../config/replayerModes';

const RootContainer = ({
  storeLoaded, gameStatusCode, checkResult, init, setCurrentUser,
}) => {
  const replayerMode = useSelector((state) => replayerModeSelector(state));
  console.log(replayerMode);
  const dispatch = useDispatch();

  useEffect(() => {
    const user = Gon.getAsset('current_user');
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    init();
  }, [init, setCurrentUser]);

  useHotkeys('command+enter, ctrl+enter', e => {
    e.preventDefault();
    checkResult();
  }, [], { filter: () => true });

  if (!storeLoaded) {
    // TODO: add loader
    return null;
  }

  if (gameStatusCode === GameStatusCodes.waitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  const isStoredGame = gameStatusCode === GameStatusCodes.stored;

  const isGameOver = gameStatusCode === GameStatusCodes.gameOver;

  const isReplayerModeOff = replayerMode !== ReplayerModes.on;

  const isReplayerModeInitialized = replayerMode !== ReplayerModes.none;

  const isReplayerModeOn = replayerMode === ReplayerModes.on;

  console.log(isReplayerModeOn);
  console.log(ReplayerModes.on);
  console.log(replayerMode);

  const showReplayer = () => {
    dispatch(actions.setReplayerModeOn());
    if (isReplayerModeInitialized) dispatch(GameActions.storedGameEditorReady());
  }

  return (
    <div className="x-outline-none">
      <div className="container-fluid">
        <div className="row no-gutter cb-game">
          <InfoWidget />
          <GameWidget />
        </div>
      </div>
      {isReplayerModeOn && <CodebattlePlayer />}
      {isGameOver && isReplayerModeOff && (
        <button className="btn btn-primary" onClick={showReplayer}>Show replayer</button>
      )}
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

const mapDispatchToProps = dispatch => ({
  setCurrentUser: (...args) => {
    dispatch(actions.setCurrentUser(...args));
  },
  init: () => {
    dispatch(GameActions.init());
  },
  checkResult: () => { dispatch(GameActions.checkGameResult()); },
});

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
