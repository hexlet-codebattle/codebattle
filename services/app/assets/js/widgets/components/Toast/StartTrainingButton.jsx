import React from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import i18n from '../../../i18n';
import * as selectors from '../../selectors';
import { makeCreateGameUrlDefault } from '../../utils/urlBuilders';

const StartTrainingButton = () => {
  const timeoutSeconds = useSelector(state => selectors.gameStatusSelector(state).timeoutSeconds);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const players = useSelector(selectors.gamePlayersSelector);

  const gameUrl = makeCreateGameUrlDefault('elementary', 'training', timeoutSeconds);

  const winner = _.find(players, ['gameResult', 'won']);
  const title = currentUserId === winner.id ? i18n.t('Start simple battle') : i18n.t('Try again');

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={gameUrl}
    >
      {title}
    </button>
  );
};

export default StartTrainingButton;
