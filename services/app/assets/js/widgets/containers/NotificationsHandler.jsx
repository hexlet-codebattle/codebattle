import _ from 'lodash';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';
import Toast from '../components/Toast';
import { Alert } from 'react-bootstrap';
import ActionAfterGame from '../components/Toast/ActionAfterGame';
import CloseButton from '../components/Toast/CloseButton';

const toastOptions = {
  hideProgressBar: true,
  position: toast.POSITION.TOP_CENTER,
  autoClose: 3000,
  closeOnClick: false,
  toastClassName: 'toast-container',
  closeButton: <CloseButton />
};

class NotificationsHandler extends Component {
  componentDidUpdate(prevProps) {
    const {
      gameStatus: { solutionStatus, status, checking },
      isCurrentUserPlayer,
    } = this.props;

    if (isCurrentUserPlayer && prevProps.gameStatus.checking && !checking) {
      this.showCheckingStatusMessage(solutionStatus);
    }

    if (status === GameStatusCodes.gameOver && prevProps.gameStatus.status !== status) {
      this.showGameResultMessage();
    }
  }

  showCheckingStatusMessage = (solutionStatus) => {
    if (solutionStatus) {
      toast(
        <Toast header='Success'>
          <Alert variant='success'>Yay! All tests passed!</Alert>
        </Toast>
      )
    } else {
      toast(
        <Toast header='Success'>
          <Alert variant='error'>Oh no, some test has failed!</Alert>
        </Toast>
      )
    }
  }

  showActionsAfterGame = () => {
    toast(
      <Toast header='Next Action'>
        <ActionAfterGame />
      </Toast>,
      { autoClose: false }
    )
  }

  showGameResultMessage = () => {
    const {
      isCurrentUserPlayer,
      currentUserId,
      players,
    } = this.props;

    const winner = _.find(players, ['game_result', 'won']);

    if (currentUserId === winner.id) {
      toast(
        <Toast header='Success'>
          <Alert variant='success'>Congratulations! You have won the game!</Alert>
        </Toast>
      );
      this.showActionsAfterGame();
      return;
    }

    if (isCurrentUserPlayer) {
      toast(
        <Toast header='Success'>
          <Alert variant='danger'>Oh snap! Your opponent has won the game</Alert>
        </Toast>
      );
      this.showActionsAfterGame();
      return;
    }

    toast.success(`${winner.user_name} has won the game!`);
  }

  render() {
    return <ToastContainer {...toastOptions} />;
  }
}

const mapStateToProps = (state) => {
  const currentUserId = selectors.currentUserIdSelector(state);
  const players = selectors.gamePlayersSelector(state);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);

  return {
    currentUserId,
    players,
    isCurrentUserPlayer,
    gameStatus: selectors.gameStatusSelector(state),
  };
};

export default connect(mapStateToProps)(NotificationsHandler);
