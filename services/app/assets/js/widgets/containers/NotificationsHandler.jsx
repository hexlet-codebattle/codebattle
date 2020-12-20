import React, { useEffect, useRef } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Alert } from 'react-bootstrap';
import i18n from '../../i18n';

import {
  gameStatusSelector,
  gamePlayersSelector,
  currentUserIdSelector,
} from '../selectors';
import Toast from '../components/Toast';
import CloseButton from '../components/Toast/CloseButton';

const toastOptions = {
  hideProgressBar: true,
  position: toast.POSITION.TOP_CENTER,
  autoClose: 3000,
  closeOnClick: false,
  toastClassName: 'bg-transparent p-0 shadow-none',
  closeButton: <CloseButton />,
};

const showCheckingStatusMessage = solutionStatus => {
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
};

const NotificationsHandler = () => {
  const currentUserId = useSelector(currentUserIdSelector);

  const usePrevious = () => {
    const ref = useRef();
    const gameStatus = useSelector(gameStatusSelector);
    useEffect(() => {
      ref.current = gameStatus.checking[currentUserId];
    });
    return ref.current;
  };

  const prevCheckingResult = usePrevious();
  const { solutionStatus, checking } = useSelector(gameStatusSelector);
  const players = useSelector(gamePlayersSelector);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const checkingResult = checking[currentUserId];

  useEffect(() => {
    if (isCurrentUserPlayer && prevCheckingResult && !checkingResult) {
      showCheckingStatusMessage(solutionStatus);
    }
  }, [checkingResult, isCurrentUserPlayer, prevCheckingResult, solutionStatus]);

  return <ToastContainer {...toastOptions} />;
};

export default NotificationsHandler;
