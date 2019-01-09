import _ from 'lodash';
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
      this.showCheckingStatusMessage(solutionStatus);
    }

    if (status === GameStatusCodes.gameOver && prevProps.gameStatus.status !== status) {
      this.showGameResultMessage();
    }
  }

  showCheckingStatusMessage = (solutionStatus) => {
    if (solutionStatus) {
      toast.success('Yay! All tests passed!');
    } else {
      toast.error('Oh no, some test has failed!');
    }
  }

  showGameResultMessage = () => {
    const {
      isCurrentUserPlayer,
      currentUserId,
      players,
    } = this.props;

    const winner = _.find(players, ['game_result', 'won']);

    if (currentUserId === winner.id) {
      toast.success('Congratulations! You have won the game!');
      return;
    }

    if (isCurrentUserPlayer) {
      toast.error('Oh snap! Your opponent has won the game');
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
