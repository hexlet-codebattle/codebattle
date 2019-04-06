import React from 'react';
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
      sended_offer: 'renderBtnAfterSendOffer',
      recieved_offer: 'renderBtnAfterRecieveOffer',
      rejected_offer: 'renderBtnAfterReject',
      default: 'renderBtnByDefault',
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
      Wait Rematch...
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

  render() {
    const { gameStatus: { rematchStatus }, currentUserId } = this.props;
    const currentRematchStatus = rematchStatus[currentUserId] || 'default';
    const fnRenderBtn = this.mapRematchStateToButtons[currentRematchStatus];
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
