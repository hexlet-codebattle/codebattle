import React from 'react';
import qs from 'qs';
import { connect } from 'react-redux';
import { gameTaskSelector } from '../../selectors';
import { sendRematch } from '../../middlewares/Game';

class ActionAfterGame extends React.Component {
  handleRematch = () => {
    sendRematch();
  }

  render () {
    const { gameTask: { level } } = this.props;
    const queryParamsString = qs.stringify({ level, type: 'withRandomPlayer' });
    const gameUrl = `/games?${queryParamsString}`;

    return(
      <React.Fragment>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={this.handleRematch}
        >
          Rematch
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={gameUrl}
        >
          New Game
        </button>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => ({
  gameTask: gameTaskSelector(state),
});

export default connect(mapStateToProps)(ActionAfterGame);
