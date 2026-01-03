import React, { useState } from 'react';

import cn from 'classnames';
import { useDispatch } from 'react-redux';

import { banPlayer } from '@/middlewares/Main';

import i18n from '../../../i18n';

const states = {
  idle: 'idle',
  banned: 'banned',
  loading: 'loading',
  error: 'error',
};

const getText = (state, text) => {
  switch (state) {
    case states.loading: return i18n.t('Sending');
    case states.error: return i18n.t('Error');
    default: return text;
  }
};

function GameBanPlayerButton({
  userId, status, tournamentId,
}) {
  const dispatch = useDispatch();
  const [state, setState] = useState(states.idle);

  const onSuccess = () => setState(states.idle);
  const onError = () => {
    setState(states.error);

    setTimeout(() => {
      setState(states.idle);
    }, 2000);
  };

  const text = getText(
    state,
    status === 'banned' ? i18n.t('Release') : i18n.t('Ban'),
  );
  const disabled = state === states.error;
  const className = cn('btn btn-sm btn-danger cb-rounded mx-1');

  const handleToggleBan = () => {
    if (disabled) return;

    setState(states.loading);
    dispatch(banPlayer(userId, tournamentId, onSuccess, onError));
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={handleToggleBan}
      title={i18n.t('Ban player')}
    >
      {text}
    </button>
  );
}

export default GameBanPlayerButton;
