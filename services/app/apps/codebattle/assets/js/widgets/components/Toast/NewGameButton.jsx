import React from 'react';
import qs from 'qs';
import { connect } from 'react-redux';
import i18n from '../../../i18n';
import GameTypeCodes from '../../config/gameTypeCodes';
import * as selectors from '../../selectors';

const NewGameButton = props => {
  const { gameTask: { level }, gameMode, timeoutSeconds } = props;
  const type = gameMode === GameTypeCodes.regular ? 'withRandomPlayer' : 'withFriend';
  const queryParamsString = qs.stringify({ level, type, timeout_seconds: timeoutSeconds });
  const gameUrl = `/games?${queryParamsString}`;

  return (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={gameUrl}
    >
      {i18n.t('Start new game')}
    </button>
  );
};

const mapStateToProps = state => ({
  timeoutSeconds: selectors.gameStatusSelector(state).timeoutSeconds,
  gameTask: selectors.gameTaskSelector(state),
});

export default connect(mapStateToProps)(NewGameButton);
