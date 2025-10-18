import React, { useState } from 'react';

import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import { reportOnPlayer } from '@/middlewares/Main';
import {
  currentUserIsAdminSelector,
  userIsGamePlayerSelector,
} from '@/selectors';

import i18n from '../../../i18n';

const states = {
  idle: 'idle',
  success: 'success',
  loading: 'loading',
  error: 'error',
};

const getText = state => {
  switch (state) {
    case states.loading:
    case states.idle:
      return i18n.t('Report');
    case states.success:
      return i18n.t('Sended');
    case states.error:
      return i18n.t('Error');
    default:
      return i18n.t('Report');
  }
};

const GameReportButton = ({ userId, gameId }) => {
  const dispatch = useDispatch();
  const [state, setState] = useState(states.idle);

  const isAdmin = useSelector(currentUserIsAdminSelector);
  const isPlayer = useSelector(userIsGamePlayerSelector);

  const onSuccess = () => setState(states.success);
  const onError = () => setState(states.error);

  const text = getText(state);
  const disabled = state !== states.idle;
  const className = cn('btn btn-sm mx-1 cb-rounded', {
    'btn-danger': state !== states.success,
    'btn-success': state === states.success,
  });

  const handleSendReport = () => {
    if (disabled) return;

    setState(states.loading);
    dispatch(reportOnPlayer(userId, gameId, onSuccess, onError));
  };

  if (!isAdmin && !isPlayer) {
    return <></>;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={handleSendReport}
      title={i18n.t('Report on player')}
    >
      {text}
    </button>
  );
};

export default GameReportButton;
