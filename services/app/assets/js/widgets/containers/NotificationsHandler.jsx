import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { Alert } from 'react-bootstrap';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';
import Toast from '../components/Toast';
import ActionsAfterGame from '../components/Toast/ActionsAfterGame';
import CloseButton from '../components/Toast/CloseButton';
import { updateGameUI as updateGameUIAction } from '../actions';
import { sendRejectToRematch } from '../middlewares/Game';
import 'react-toastify/dist/ReactToastify.css';

const toastOptions = {
  hideProgressBar: true,
  position: toast.POSITION.TOP_CENTER,
  autoClose: 3000,
  closeOnClick: false,
  toastClassName: 'toast-container',
  closeButton: <CloseButton />,
};

class NotificationsHandler extends Component {
  componentDidMount() {
    const { gameStatus: { status } } = this.props;

    if (status === GameStatusCodes.gameOver
      || status === GameStatusCodes.rematchInApproval
      || status === GameStatusCodes.rematchRejected) {
      this.showActionsAfterGame();
    }
  }

  componentDidUpdate(prevProps) {
    const {
      gameStatus: {
        solutionStatus, status, checking, rematchState,
      },
      isCurrentUserPlayer,
    } = this.props;

    const isChangeRematchState = prevProps.gameStatus.rematchState !== rematchState;
    const statusChanged = prevProps.gameStatus.status !== status;

    if (isCurrentUserPlayer && prevProps.gameStatus.checking && !checking) {
      this.showCheckingStatusMessage(solutionStatus);
    }

    if (status === GameStatusCodes.gameOver && statusChanged) {
      this.showActionsAfterGame();
    }

    if (status === GameStatusCodes.timeout && statusChanged) {
      this.showActionsAfterGame();
    }

    if (isChangeRematchState && rematchState !== 'none' && rematchState !== 'rejected') {
      this.showActionsAfterGame();
    }
  }


  getResultMessage() {
    const {
      isCurrentUserPlayer,
      currentUserId,
      players,
      gameStatus,
    } = this.props;

    const winner = _.find(players, ['gameResult', 'won']);

    if (gameStatus.status === GameStatusCodes.timeout) {
      return ({
        alertStyle: 'danger',
        msg: this.gameStatus.msg,
      });
    } if (currentUserId === winner.id) {
      return ({
        alertStyle: 'success',
        msg: 'Congratulations! You have won the game!',
      });
    } if (isCurrentUserPlayer) {
      return ({
        alertStyle: 'danger',
        msg: 'Oh snap! Your opponent has won the game',
      });
    }

    return null;
  }

    showCheckingStatusMessage = solutionStatus => {
      if (solutionStatus) {
        toast(
          <Toast header="Success">
            <Alert variant="success">Yay! All tests passed!</Alert>
          </Toast>,
        );
      } else {
        toast(
          <Toast header="Failed">
            <Alert variant="error">Oh no, some test has failed!</Alert>
          </Toast>,
        );
      }
    }

  showActionsAfterGame = () => {
    const {
      isCurrentUserPlayer,
      updateGameUI,
      isShowActionsAfterGame,
    } = this.props;

    if (!isCurrentUserPlayer) {
      return;
    }

    if (isShowActionsAfterGame) {
      return;
    }

    toast(
      <Toast header="Game over">
        {this.showGameResultMessage()}
        <ActionsAfterGame />
      </Toast>,
      {
        autoClose: false,
        onClose: () => {
          updateGameUI({ showToastActionsAfterGame: false });
          sendRejectToRematch();
        },
        onOpen: () => updateGameUI({ showToastActionsAfterGame: true }),
      },
    );
  }

  showGameResultMessage() {
    const { alertStyle, msg } = this.getResultMessage();
    return (<Alert variant={alertStyle}>{msg}</Alert>);
  }

  render() {
    return <ToastContainer {...toastOptions} />;
  }
}

const mapStateToProps = state => {
  const currentUserId = selectors.currentUserIdSelector(state);
  const players = selectors.gamePlayersSelector(state);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const isShowActionsAfterGame = state.gameUI.showToastActionsAfterGame;

  return {
    currentUserId,
    players,
    isCurrentUserPlayer,
    isShowActionsAfterGame,
    gameStatus: selectors.gameStatusSelector(state),
  };
};

const mapDispatchToProps = {
  updateGameUI: updateGameUIAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotificationsHandler);
