import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { Alert } from 'react-bootstrap';
import i18n from '../../i18n';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';
import GameTypeCodes from '../config/gameTypeCodes';
import Toast from '../components/Toast';
import ActionsAfterGame from '../components/Toast/ActionsAfterGame';
import CloseButton from '../components/Toast/CloseButton';
import { actions } from '../slices';
import { sendRejectToRematch } from '../middlewares/Game';
import 'react-toastify/dist/ReactToastify.css';

const toastOptions = {
  hideProgressBar: true,
  position: toast.POSITION.TOP_CENTER,
  autoClose: 3000,
  closeOnClick: false,
  toastClassName: 'bg-transparent p-0 shadow-none',
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
      currentUserId,
      isCurrentUserPlayer,
    } = this.props;

    const isChangeRematchState = prevProps.gameStatus.rematchState !== rematchState;
    const statusChanged = prevProps.gameStatus.status !== status;
    const prevCheckingResult = prevProps.gameStatus.checking[currentUserId];
    const checkingResult = checking[currentUserId];

    if (
      isCurrentUserPlayer && prevCheckingResult && !checkingResult
      && status === GameStatusCodes.playing) {
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
      gameType,
    } = this.props;

    const winner = _.find(players, ['gameResult', 'won']);

    if (gameStatus.status === GameStatusCodes.timeout) {
      return ({
        alertStyle: 'danger',
        msg: gameStatus.msg,
      });
    } if (currentUserId === winner.id) {
      const msg = gameType === GameTypeCodes.training
        ? i18n.t('Win Training Message')
        : i18n.t('Win Game Message');

      return ({
        alertStyle: 'success',
        msg,
      });
    } if (isCurrentUserPlayer) {
      return ({
        alertStyle: 'danger',
        msg: i18n.t('Lose Game Message'),
      });
    }

    return null;
  }

    showCheckingStatusMessage = solutionStatus => {
      if (solutionStatus) {
        toast(
          <Toast header="Success">
            <Alert variant="success">{i18n.t('Success Test Message')}</Alert>
          </Toast>,
        );
      } else {
        toast(
          <Toast header="Failed">
            <Alert variant="danger">{i18n.t('Failure Test Message')}</Alert>
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
    const result = this.getResultMessage();
    if (result) {
      return (<Alert variant={result.alertStyle}>{result.msg}</Alert>);
    }
    return null;
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
    gameType: selectors.gameTypeSelector(state),
  };
};

const mapDispatchToProps = {
  updateGameUI: actions.updateGameUI,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotificationsHandler);
