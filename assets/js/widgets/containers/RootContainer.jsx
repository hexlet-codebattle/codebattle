import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import copy from 'copy-to-clipboard';
import i18n from 'i18next';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import Gon from 'Gon';
import userTypes from '../config/userTypes';
import * as actions from '../actions';
import * as GameActions from '../middlewares/Game';
import GameStatusCodes from '../config/gameStatusCodes';
import { gameStatusSelector } from '../selectors';

class RootContainer extends React.Component {
  componentDidMount() {
    const user = Gon.getAsset('current_user');
    const { setCurrentUser, editorReady } = this.props;

    // FIXME: maybe take from gon?
    setCurrentUser({ user: { ...user, type: userTypes.spectator } });
    editorReady();
  }

  render() {
    switch (true) {
      case !this.props.storeLoaded:
        // TODO: add loader
        return null;
      case (this.props.gameStatusCode  === GameStatusCodes.waitingOpponent):
        const gameUrl = window.location.href;
        return (
          <div className="jumbotron jumbotron-fluid">
            <div className="container">
              <h1 className="display-4">{i18n.t('Waiting opponent')}</h1>
              <p className="lead">{i18n.t('We seek for opponent for you. You can invite to start playing')}</p>
              <div className="row">
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    aria-label="Recipient's username"
                    aria-describedby="basic-addon2"
                    value={gameUrl}
                    readOnly
                  />
                  <div className="input-group-append">
                    <button
                      className="btn btn-outline-primary"
                      type="button"
                      onClick={() => copy(gameUrl)}
                    >
                      {i18n.t('Copy')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <Fragment>
            <GameWidget />
            <InfoWidget />
          </Fragment>
        );
    }
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
