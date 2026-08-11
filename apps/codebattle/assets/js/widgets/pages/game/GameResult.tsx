import React, { useMemo } from 'react';

import { Alert } from '@mantine/core';
import find from 'lodash/find';
import hasIn from 'lodash/hasIn';
import { useSelector } from 'react-redux';

import { type RootState } from '@/slices';

import i18n from '../../../i18n';
import GameRoomModes from '../../config/gameModes';
import GameStateCodes from '../../config/gameStateCodes';
import * as selectors from '../../selectors';
import { alertVariantColor, darkThemeAlertStyles } from '../../ui/alert';

function GameResult() {
  const currentUserId = useSelector((state: RootState) => selectors.currentUserIdSelector(state));
  const players = useSelector((state: RootState) => selectors.gamePlayersSelector(state));
  const isCurrentUserPlayer = hasIn(players, currentUserId as number);
  const gameStatus = useSelector((state: RootState) => selectors.gameStatusSelector(state));
  const gameMode = useSelector((state: RootState) => selectors.gameModeSelector(state));

  const result = useMemo(() => {
    if (gameStatus.state === GameStateCodes.timeout) {
      return {
        alertStyle: 'danger',
        msg: i18n.t('Time is up. There are no winners in the game'),
      };
    }

    const winner = find(players, ['result', 'won']);

    if (!winner) {
      return null;
    }

    if (currentUserId === winner.id) {
      const msg =
        gameMode === GameRoomModes.training
          ? i18n.t('Win Training Message')
          : i18n.t('Win Game Message');

      return {
        alertStyle: 'success',
        msg,
        isWin: true,
      };
    }
    if (isCurrentUserPlayer) {
      return {
        alertStyle: 'danger',
        msg: i18n.t('Lose Game Message'),
      };
    }

    return null;
  }, [currentUserId, players, isCurrentUserPlayer, gameStatus.state, gameMode]);

  if (result) {
    return (
      <Alert
        color={alertVariantColor(result.alertStyle)}
        variant="light"
        styles={darkThemeAlertStyles(result.alertStyle, Boolean(result.isWin))}
        style={{ borderRadius: 0, marginTop: '0.5rem' }}
      >
        {result.msg}
      </Alert>
    );
  }
  return null;
}

export default GameResult;
