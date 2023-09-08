import React from 'react';

import find from 'lodash/find';
import { useSelector } from 'react-redux';

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
      className="btn btn-primary btn-block"
      data-csrf={window.csrf_token}
      data-method="post"
      data-to={getCreateTrainingGameUrl}
      type="button"
    >
      {title}
    </button>
  );
}

export default StartTrainingButton;
