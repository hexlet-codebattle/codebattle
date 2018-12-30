import React, { Component } from 'react';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import _ from 'lodash';
import Hotkeys from 'react-hot-keys';
import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, sendGiveUp } from '../middlewares/Game';
import userTypes from '../config/userTypes';

class GameActionButtons extends Component {
  static defaultProps = {
    status: GameStatusCodes.initial,
  }

  renderCheckResultButton = (canCheckResult, checkResult, gameStatus) => {
    if (!canCheckResult) {
      return null;
    }

    return (
      <button
        type="button"
        className="btn btn-success btn-sm ml-1"
        onClick={checkResult}
        disabled={gameStatus.checking}
      >
        {gameStatus.checking ? (
          <span className="mx-1 fa fa-cog fa-spin" />
        ) : (
          <span className="mx-1 fa fa-play-circle" />
        )}
        {i18n.t('Check')}
        <small> (ctrl+enter)</small>
      </button>
    );
  }

  renderGiveUpButton = (canGiveUp) => {
    if (!canGiveUp) {
      return null;
    }

    return (
      <button
        type="button"
        className="btn btn-outline-danger btn-sm"
        onClick={sendGiveUp}
      >
        <span className="mx-1 fa fa-times-circle" />
        {i18n.t('Give up')}
      </button>
    );
  }


  render() {
    const {
      gameStatus,
      checkResult,
      currentUser,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;
    const allowedGameStatusCodes = [GameStatusCodes.playing, GameStatusCodes.gameOver];
    const canGiveUp = gameStatus.status === GameStatusCodes.playing && !isSpectator;
    const canCheckResult = _.includes(allowedGameStatusCodes, gameStatus.status)
      && userType && !isSpectator;

    return (
      <Hotkeys keyName="ctrl+Enter" onKeyUp={checkResult}>
        <div className="btn-toolbar justify-content-between pb-2" role="toolbar">
          {this.renderGiveUpButton(canGiveUp)}
          {this.renderCheckResultButton(canCheckResult, checkResult, gameStatus)}
        </div>
      </Hotkeys>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUser = selectors.currentUserSelector(state);

  return {
    currentUser,
    gameStatus: selectors.gameStatusSelector(state),
    task: selectors.gameTaskSelector(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameActionButtons);
