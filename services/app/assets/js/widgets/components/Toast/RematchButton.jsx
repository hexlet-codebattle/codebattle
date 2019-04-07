import React from 'react';
import qs from 'qs';
import axios from 'axios';
import { connect } from 'react-redux';
import * as selectors from '../../selectors';
import {
  sendOfferToRematch,
  sendRejectToRematch,
  sendAcceptToRematch,
} from '../../middlewares/Game';

class RematchButton extends React.Component {
  constructor(props) {
    super(props);
    this.mapRematchStateToButtons = {
      in_approval_initiator: 'renderBtnAfterSendOffer',
      in_approval_acceptor: 'renderBtnAfterRecieveOffer',
      rejected_initiator: 'renderBtnAfterReject',
      rejected_acceptor: 'renderBtnAfterReject',
      none: 'renderBtnByDefault',
    };
  }

  handleAcceptRematch = () => {
    sendAcceptToRematch();
  }

  renderBtnAfterReject = () => (
    <button
      type="button"
      className="btn btn-danger btn-block"
      disabled
    >
      Rejected Offer
    </button>
  );

  renderBtnAfterSendOffer = () => (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      disabled
    >
      Wait Answer...
    </button>
  );

  renderBtnAfterRecieveOffer = () => (
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

  renderBtnByDefault = () => (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      onClick={sendOfferToRematch}
    >
      Rematch
    </button>
  );

  getPlayerStatus = (rematchInitiatorId, currentUserId) => {
    if (rematchInitiatorId === null) {
      return null;
    }
    return rematchInitiatorId == currentUserId ? 'initiator' : 'acceptor';
  }

  render() {
    const { gameStatus: { rematchState, rematchInitiatorId }, currentUserId } = this.props;
    const playerStatus = this.getPlayerStatus(rematchInitiatorId, currentUserId);
    const fnRenderBtn = this.mapRematchStateToButtons[`${rematchState}_${playerStatus}`]
      || this.mapRematchStateToButtons['none'];
    return this[fnRenderBtn]();
  }
}

const mapStateToProps = (state) => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
  };
};

export default connect(mapStateToProps)(RematchButton);
