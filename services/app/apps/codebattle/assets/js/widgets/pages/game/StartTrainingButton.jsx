import React from 'react';
import { useSelector } from 'react-redux';
import find from 'lodash/find';
import i18n from '../../../i18n';
import * as selectors from '../../selectors';
import { getCreateTrainingGameUrl } from '../../utils/urlBuilders';

function StartTrainingButton() {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const players = useSelector(selectors.gamePlayersSelector);

  const winner = find(players, ['result', 'won']);
  const title = currentUserId === winner.id ? i18n.t('Start simple battle') : i18n.t('Try again');

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={getCreateTrainingGameUrl}
    >
      {title}
    </button>
  );
}

export default StartTrainingButton;
