import React from 'react';
import qs from 'qs';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';

const NewGameButton = props => {
  const { gameTask: { level }, timeoutSeconds } = props;
  const queryParamsString = qs.stringify({ level, type: 'withRandomPlayer', timeout_seconds: timeoutSeconds });
  const gameUrl = `/games?${queryParamsString}`;

  return (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={gameUrl}
    >
      New Game
    </button>
  );
};

const mapStateToProps = state => ({
  timeoutSeconds: selectors.gameStatusSelector(state).timeoutSeconds,
  gameTask: selectors.gameTaskSelector(state),
});

export default connect(mapStateToProps)(NewGameButton);
