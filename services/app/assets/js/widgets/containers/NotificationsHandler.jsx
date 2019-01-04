import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';

const toastOptions = {
  hideProgressBar: true,
  position: toast.POSITION.TOP_CENTER,
};

class NotificationsHandler extends Component {
  componentDidUpdate(prevProps) {
    const {
      gameStatus: { solutionStatus, status, checking },
      isCurrentUserPlayer,
    } = this.props;
    if (isCurrentUserPlayer && prevProps.gameStatus.checking && !checking) {
      this.showCheckingStatusMessage();
    }
    if (status === GameStatusCodes.gameOver && prevProps.gameStatus.status !== status) {
      this.showGameResultMessage();
    }
  }

  showCheckingStatusMessage = () => {
    const { gameStatus: { solutionStatus } } = this.props;
    switch (solutionStatus) {
      case true:
        toast.success('Yay! All tests passed!');
        return;
      case false:
        toast.error('Oh no, some test has failed!');
      default:
        break;
    }
  }

  showGameResultMessage = () => {
    const {
      gameStatus: { winner, status },
      isCurrentUserPlayer,
      currentUser,
    } = this.props;
    if (winner.id === currentUser.id) {
      toast.success('Congratulations! You have won the game!');
      return;
    }
    if (isCurrentUserPlayer) {
      toast.error('Oh snap! Your opponent has won the game');
      return;
    }
    toast.success(`${winner.name} has won the game!`);
  }

  render() {
    return <ToastContainer {...toastOptions} />;
  }
}

const mapStateToProps = (state) => {
  const currentUser = selectors.currentUserSelector(state);
  const leftUserId = _.get(selectors.leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);

  return {
    currentUser,
    isCurrentUserPlayer: currentUser.id === leftUserId || currentUser.id === rightUserId,
    gameStatus: selectors.gameStatusSelector(state),
  };
};

export default connect(mapStateToProps)(NotificationsHandler);
