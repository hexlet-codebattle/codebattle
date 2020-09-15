import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { Alert } from 'react-bootstrap';
import i18n from '../../i18n';
import * as selectors from '../selectors';
import GameStatusCodes from '../config/gameStatusCodes';
import Toast from '../components/Toast';
import CloseButton from '../components/Toast/CloseButton';
import { actions } from '../slices';
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
  componentDidUpdate(prevProps) {
    const {
      gameStatus: {
        solutionStatus, status, checking,
      },
      currentUserId,
      isCurrentUserPlayer,
    } = this.props;
    const prevCheckingResult = prevProps.gameStatus.checking[currentUserId];
    const checkingResult = checking[currentUserId];

    if (
      isCurrentUserPlayer && prevCheckingResult && !checkingResult
      && status === GameStatusCodes.playing) {
      this.showCheckingStatusMessage(solutionStatus);
    }
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

  render() {
    return <ToastContainer {...toastOptions} />;
  }
}

const mapStateToProps = state => {
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

const mapDispatchToProps = {
  updateGameUI: actions.updateGameUI,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotificationsHandler);
