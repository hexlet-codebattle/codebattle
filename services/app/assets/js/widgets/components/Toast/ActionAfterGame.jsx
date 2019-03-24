import React from 'react';
import _ from 'lodash';
import qs from 'qs';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import { sendOfferToRematch, sendRejectToRematch, sendAcceptToRematch } from '../../middlewares/Game';
import axios from 'axios';

class ActionAfterGame extends React.Component {
  renderButtonNewGame = () => {
    const { gameTask: { level } } = this.props;
    const queryParamsString = qs.stringify({ level, type: 'withRandomPlayer' });
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

  handleAcceptRematch = () => {
    const { gameTask: { level } } = this.props;
    const queryParamsString = qs.stringify({ level });
    const gameUrl = `/api/v1/games?${queryParamsString}`;
    const csrf = window.csrf_token;

    axios.post(gameUrl, {}, { headers: { 'X-CSRF-Token': csrf } })
      .then((res) => sendAcceptToRematch(res.data.game_id));
  }

  renderButtonRematch = () => {
    const { gameStatus: { rematchStatus }, currentUserId, isCurrentUserPlayer } = this.props; 
    const isCurrentUserSendOfferToRematch = rematchStatus[currentUserId] === 'sended_offer';
    const isCurrentUserFetchOfferToRematch = rematchStatus[currentUserId] === 'recieved_offer';
    const isRejectOfferToRematch = rematchStatus[currentUserId] === 'rejected_offer';

    if (isRejectOfferToRematch) {
      return (
        <button
          type="button"
          className="btn btn-danger btn-block"
          disabled={true}
        >
          Rejected Offer
        </button>
      );
    }

    if (isCurrentUserSendOfferToRematch) {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={true}
        >
          Wait Rematch...
        </button>
      );
    }

    if (isCurrentUserFetchOfferToRematch) {
      return (
        <div className="input-group mt-2">
          <input type="text" className="form-control" placeholder="Accept Rematch?" disabled="" />
          <div className="input-group-append">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={this.handleAcceptRematch}
            >
              Yes
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={sendRejectToRematch}
            >
              No
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={sendOfferToRematch}
      >
        Rematch
      </button>
    );
  }

  render () {
    return(
      <React.Fragment>
        {this.renderButtonNewGame()}
        {this.renderButtonRematch()}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUserId = selectors.currentUserIdSelector(state);
  const players = selectors.gamePlayersSelector(state);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    isCurrentUserPlayer,
    currentUserId,
  }
};

export default connect(mapStateToProps)(ActionAfterGame);
