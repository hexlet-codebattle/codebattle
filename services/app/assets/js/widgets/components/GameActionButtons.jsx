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

  renderCheckResultButton = (canCheckResult, checkResult, gameStatus, disabled) => {
    if (!canCheckResult) {
      return null;
    }

    return (
      <button
        type="button"
        className="btn btn-success btn-sm ml-auto"
        onClick={checkResult}
        disabled={disabled || gameStatus.checking}
      >
        {gameStatus.checking ? (
          <span className="fa fa-cog fa-spin mr-1" />
        ) : (
          <span className="fa fa-play-circle mr-1" />
        )}
        {i18n.t('Check')}
        <small> (ctrl+enter)</small>
      </button>
    );
  }

  renderGiveUpButton = (canGiveUp, disabled) => {
    if (!canGiveUp) {
      return null;
    }

    return (
      <button
        type="button"
        className="btn btn-outline-danger btn-sm"
        onClick={sendGiveUp}
        disabled={disabled}
      >
        <span className="fa fa-times-circle mr-1" />
        {i18n.t('Give up')}
      </button>
    );
  }


  render() {
    const {
      disabled,
      gameStatus,
      checkResult,
      currentUser,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;
    const allowedGameStatusCodes = [GameStatusCodes.playing, GameStatusCodes.gameOver];
    const canGiveUp = gameStatus.status === GameStatusCodes.playing;
    const canCheckResult = _.includes(allowedGameStatusCodes, gameStatus.status);
    const realDisabled = isSpectator || disabled;

    return (
      <Hotkeys keyName="ctrl+Enter" onKeyUp={checkResult}>
        <div className="btn-toolbar py-2" role="toolbar">
          {this.renderGiveUpButton(canGiveUp, realDisabled)}
          {this.renderCheckResultButton(canCheckResult, checkResult, gameStatus, realDisabled)}
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
