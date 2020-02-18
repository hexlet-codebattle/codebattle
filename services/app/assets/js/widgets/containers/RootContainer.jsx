import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { HotKeys } from 'react-hotkeys';
import Gon from 'gon';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import * as actions from '../actions';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector } from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';
import CodebattlePlayer from './CodebattlePlayer';

const ComponentForHandlers = ({ children }) => (
  <div style={{ outline: 'none' }}>{children}</div>
);

class RootContainer extends React.Component {
  componentDidMount() {
    const user = Gon.getAsset('current_user');
    const { setCurrentUser, init } = this.props;
    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    init();
  }

  render() {
    const {
      storeLoaded, gameStatusCode, checkResult,
    } = this.props;
    const keyMap = {
      CHECK_GAME: ['command+enter', 'ctrl+enter'],
    };

    const handlers = {
      CHECK_GAME: () => { checkResult(); },
    };

    if (!storeLoaded) {
      // TODO: add loader
      return null;
    }

    if (gameStatusCode === GameStatusCodes.waitingOpponent) {
      const gameUrl = window.location.href;
      return <WaitingOpponentInfo gameUrl={gameUrl} />;
    }

    const isStoredGame = gameStatusCode === GameStatusCodes.stored;

    return (
      <HotKeys
        keyMap={keyMap}
        handlers={handlers}
        component={ComponentForHandlers}
      >
        <div className="container-fluid">
          <InfoWidget />
          <GameWidget />
        </div>
        {isStoredGame && <CodebattlePlayer />}
      </HotKeys>
    );
  }
}

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
