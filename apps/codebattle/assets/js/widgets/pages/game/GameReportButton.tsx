import React, { useState } from 'react';

import { Button } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import { reportOnPlayer } from '@/middlewares/Main';
import { currentUserIsAdminOrModeratorSelector, userIsGamePlayerSelector } from '@/selectors';
import { type AppDispatch } from '@/slices';

import i18n from '../../../i18n';

const states = {
  idle: 'idle',
  success: 'success',
  loading: 'loading',
  error: 'error',
};

const getText = (state: string) => {
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

interface GameReportButtonProps {
  userId: number;
  gameId: number;
}

function GameReportButton({ userId, gameId }: GameReportButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [state, setState] = useState(states.idle);

  const isAdmin = useSelector(currentUserIsAdminOrModeratorSelector);
  const isPlayer = useSelector(userIsGamePlayerSelector);

  const onSuccess = () => setState(states.success);
  const onError = () => setState(states.error);

  const text = getText(state);
  const disabled = state !== states.idle;
  const isSuccess = state === states.success;

  const handleSendReport = () => {
    if (disabled) return;

    setState(states.loading);
    dispatch(reportOnPlayer(userId, gameId, onSuccess, onError));
  };

  if (!isAdmin && !isPlayer) {
    return <></>;
  }

  return (
    <Button
      size="compact-sm"
      mx="xs"
      radius="md"
      disabled={disabled}
      onClick={handleSendReport}
      title={i18n.t('Report on player')}
      style={{
        backgroundColor: isSuccess ? '#28a745' : '#dc3545',
      }}
    >
      {text}
    </Button>
  );
}

export default GameReportButton;
