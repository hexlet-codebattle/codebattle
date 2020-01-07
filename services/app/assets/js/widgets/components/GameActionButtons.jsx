import React, { Component } from 'react';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, sendGiveUp } from '../middlewares/Game';

class GameActionButtons extends Component {
  static defaultProps = {
    status: GameStatusCodes.initial,
  }

  state = { modalShowing: false };

  modalHide = () => {
    this.setState({ modalShowing: false });
  }

  modalShow = () => {
    this.setState({ modalShowing: true });
  }

  handleGiveUp = () => {
    this.modalHide();
    sendGiveUp();
  }

  renderCheckResultButton = (checkResult, gameStatus, disabled, editorUser) => (
    <button
      type="button"
      className="btn btn-success btn-sm ml-auto"
      onClick={checkResult}
      disabled={gameStatus.checking[editorUser] || disabled}
    >

      {
        (gameStatus.checking[editorUser])
          ? <FontAwesomeIcon icon="spinner" pulse />
          : <FontAwesomeIcon icon="play-circle" />
      }

      {` ${i18n.t('Check')}`}
      <small> (ctrl+enter)</small>
    </button>
  )

  renderGiveUpButton = (canGiveUp, disabled) => (
    <button
      type="button"
      className="btn btn-outline-danger btn-sm"
      onClick={this.modalShow}
      disabled={!canGiveUp ? true : disabled}
    >
      <span className="fa fa-times-circle mr-1" />
      {i18n.t('Give up')}
    </button>
  )

  renderModal = () => {
    const { modalShowing } = this.state;
    return (
      <Modal show={modalShowing} onHide={this.modalHide}>
        <Modal.Body className="text-center">
            Are you sure you want to give up?
        </Modal.Body>
        <Modal.Footer className="mx-auto">
          <Button onClick={this.handleGiveUp} className="btn-danger">Give up</Button>
          <Button onClick={this.modalHide} className="btn-secondary">Cancel</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  render() {
    const {
      disabled,
      gameStatus,
      checkResult,
      players,
      currentUserId,
      editorUser,
    } = this.props;

    const isSpectator = !_.hasIn(players, currentUserId);
    const canGiveUp = gameStatus.status === GameStatusCodes.playing;
    const realDisabled = isSpectator || disabled;

    return (
      <div className="btn-toolbar py-3 px-3" role="toolbar">
        {this.renderGiveUpButton(canGiveUp, realDisabled)}
        {this.renderCheckResultButton(
          checkResult,
          gameStatus,
          realDisabled,
          editorUser,
        )}
        {this.renderModal()}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  players: selectors.gamePlayersSelector(state),
  currentUserId: selectors.currentUserIdSelector(state),
  gameStatus: selectors.gameStatusSelector(state),
  task: selectors.gameTaskSelector(state),
});

const mapDispatchToProps = {
  checkResult: checkGameResult,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameActionButtons);
