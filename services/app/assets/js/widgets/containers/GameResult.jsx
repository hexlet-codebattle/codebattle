import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import { Alert } from 'react-bootstrap';
import * as selectors from '../selectors';
import GameTypeCodes from '../config/gameTypeCodes';
import GameStateCodes from '../config/gameStateCodes';
import i18n from '../../i18n';

const GameResult = () => {
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));
  const gameType = useSelector(state => selectors.gameTypeSelector(state));

  const getResultMessage = () => {
    if (gameStatus.state === GameStateCodes.timeout) {
      return ({
        alertStyle: 'danger',
        msg: gameStatus.msg,
      });
    }

    const winner = _.find(players, ['gameResult', 'won']);

    if (!winner) {
      return null;
    }

    if (currentUserId === winner.id) {
      const msg = gameType === GameTypeCodes.training
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
  };

  const result = getResultMessage();
  if (result) {
    return (<Alert variant={result.alertStyle}>{result.msg}</Alert>);
  }
  return null;
};

export default GameResult;
