import React from 'react';

import qs from 'qs';
import { connect } from 'react-redux';

import i18n from '../../../i18n';
import GameTypeCodes from '../../config/gameTypeCodes';
import * as selectors from '../../selectors';

function NewGameButton(props) {
  const {
    gameMode,
    gameTask: { level },
    timeoutSeconds,
  } = props;
  const type = gameMode === GameTypeCodes.regular ? 'withRandomPlayer' : 'withFriend';
  const queryParamsString = qs.stringify({ level, type, timeout_seconds: timeoutSeconds });
  const gameUrl = `/games?${queryParamsString}`;

  return (
    <button
      className="btn btn-secondary btn-block rounded-lg"
      data-csrf={window.csrf_token}
      data-method="post"
      data-to={gameUrl}
      type="button"
    >
      {i18n.t('Start new game')}
    </button>
  );
}

const mapStateToProps = (state) => ({
  timeoutSeconds: selectors.gameStatusSelector(state).timeoutSeconds,
  gameTask: selectors.gameTaskSelector(state),
});

export default connect(mapStateToProps)(NewGameButton);
