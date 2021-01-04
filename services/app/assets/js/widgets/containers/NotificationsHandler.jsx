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
  executionOutputSelector,
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

const showCheckingStatusMessage = executionOutputStatus => {
  if (executionOutputStatus === 'ok') {
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
  const { checking } = useSelector(gameStatusSelector);
  const players = useSelector(gamePlayersSelector);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const checkingResult = checking[currentUserId];
  const { status } = useSelector(executionOutputSelector(currentUserId));

  useEffect(() => {
    if (isCurrentUserPlayer && prevCheckingResult && !checkingResult) {
      showCheckingStatusMessage(status);
    }
  }, [checkingResult, isCurrentUserPlayer, prevCheckingResult, status]);

  return <ToastContainer {...toastOptions} />;
};

export default NotificationsHandler;
