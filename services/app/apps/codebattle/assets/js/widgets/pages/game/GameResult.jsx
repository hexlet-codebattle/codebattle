import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import hasIn from 'lodash/hasIn';
import find from 'lodash/find';
import Alert from 'react-bootstrap/Alert';
import * as selectors from '../../selectors';
import GameRoomModes from '../../config/gameModes';
import GameStateCodes from '../../config/gameStateCodes';
import i18n from '../../../i18n';

function GameResult() {
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const isCurrentUserPlayer = hasIn(players, currentUserId);
  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));
  const gameMode = useSelector(state => selectors.gameModeSelector(state));

  const result = useMemo(() => {
    if (gameStatus.state === GameStateCodes.timeout) {
      return ({
        alertStyle: 'danger',
        msg: 'Time is up. There are no winners in the game',
      });
    }

    const winner = find(players, ['result', 'won']);

    if (!winner) {
      return null;
    }

    if (currentUserId === winner.id) {
      const msg = gameMode === GameRoomModes.training
        ? i18n.t('Win Training Message')
        : i18n.t('Win Game Message');

      return ({
        alertStyle: 'success',
        msg,
      });
    } if (isCurrentUserPlayer) {
      return ({
        alertStyle: 'danger',
        msg: i18n.t('Lose Game Message'),
      });
    }

    return null;
  }, [
    currentUserId,
    players,
    isCurrentUserPlayer,
    gameStatus.state,
    gameMode,
  ]);

  if (result) {
    return (<Alert variant={result.alertStyle}>{result.msg}</Alert>);
  }
  return null;
}

export default GameResult;
