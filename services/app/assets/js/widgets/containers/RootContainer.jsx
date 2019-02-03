import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Gon from 'gon';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import userTypes from '../config/userTypes';
import * as actions from '../actions';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector } from '../selectors';
import WaitingOpponentInfo from '../components/WaitingOpponentInfo';

class RootContainer extends React.Component {
  componentDidMount() {
    const user = Gon.getAsset('current_user');
    const { setCurrentUser, editorReady } = this.props;

    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    editorReady();
  }

  render() {
    const { storeLoaded, gameStatusCode } = this.props;

    if (!storeLoaded) {
      // TODO: add loader
      return null;
    }

    if (gameStatusCode === GameStatusCodes.waitingOpponent) {
      const gameUrl = window.location.href;
      return <WaitingOpponentInfo gameUrl={gameUrl} />;
    }

    return (
      <Fragment>
        <InfoWidget />
        <GameWidget />
      </Fragment>
    );
  }
}

RootContainer.propTypes = {
  storeLoaded: PropTypes.bool.isRequired,
  setCurrentUser: PropTypes.func.isRequired,
  editorReady: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  storeLoaded: state.storeLoaded,
  gameStatusCode: gameStatusSelector(state).status,
});

const mapDispatchToProps = dispatch => ({
  setCurrentUser: (...args) => {
    dispatch(actions.setCurrentUser(...args));
  },
  editorReady: () => {
    dispatch(GameActions.editorReady());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
