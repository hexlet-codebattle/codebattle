import React, { useState } from 'react';

import { Button } from '@mantine/core';
import { useDispatch } from 'react-redux';

import { banPlayer } from '@/middlewares/Main';
import { type AppDispatch } from '@/slices';

import i18n from '../../../i18n';

const states = {
  idle: 'idle',
  banned: 'banned',
  loading: 'loading',
  error: 'error',
};

const getText = (state: string, text: string) => {
  switch (state) {
    case states.loading:
      return i18n.t('Sending');
    case states.error:
      return i18n.t('Error');
    default:
      return text;
  }
};

interface GameBanPlayerButtonProps {
  userId: number;
  status: string;
  tournamentId: number;
}

function GameBanPlayerButton({ userId, status, tournamentId }: GameBanPlayerButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [state, setState] = useState(states.idle);

  const onSuccess = () => setState(states.idle);
  const onError = () => {
    setState(states.error);

    setTimeout(() => {
      setState(states.idle);
    }, 2000);
  };

  const text = getText(state, status === 'banned' ? i18n.t('Release') : i18n.t('Ban'));
  const disabled = state === states.error;

  const handleToggleBan = () => {
    if (disabled) return;

    setState(states.loading);
    dispatch(banPlayer(userId, tournamentId, onSuccess, onError));
  };

  return (
    <Button
      type="button"
      size="sm"
      radius="md"
      color="red"
      mx="xs"
      disabled={disabled}
      onClick={handleToggleBan}
      title={i18n.t('Ban player')}
    >
      {text}
    </Button>
  );
}

export default GameBanPlayerButton;
