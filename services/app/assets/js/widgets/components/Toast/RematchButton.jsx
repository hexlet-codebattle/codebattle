import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import * as selectors from '../../selectors';
import i18n from '../../../i18n';
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
      {i18n.t('Rejected Offer')}
    </button>
  );

  renderBtnAfterSendOffer = () => {
    const { isOpponentInGame } = this;
    const text = isOpponentInGame ? 'Wait For An Answer...' : 'Opponent Left The Game';
    const classNames = cn('btn btn-block', {
      'btn-secondary': isOpponentInGame,
      'btn-warning': !isOpponentInGame,
    });
    return (
      <button
        type="button"
        className={classNames}
        disabled
      >
        {i18n.t(text)}
      </button>
    );
  };

  renderBtnAfterRecieveOffer = () => (
    <div className="input-group mt-2">
      <input type="text" className="form-control" placeholder="Accept Rematch?" disabled="" />
      <div className="input-group-append">
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={this.handleAcceptRematch}
        >
          {i18n.t('Yes')}
        </button>
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={sendRejectToRematch}
        >
          {i18n.t('No')}
        </button>
      </div>
    </div>
  );

  renderBtnByDefault = () => {
    const { disabled } = this.props;
    return (
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={sendOfferToRematch}
        disabled={disabled}
      >
        {disabled ? i18n.t('Opponent has left') : i18n.t('Rematch')}
      </button>
    );
  };

  getPlayerStatus = (rematchInitiatorId, currentUserId) => {
    if (rematchInitiatorId === null) {
      return null;
    }
    return rematchInitiatorId === currentUserId ? 'initiator' : 'acceptor';
  }

  render() {
    const { gameStatus: { rematchState, rematchInitiatorId }, currentUserId } = this.props;
    const playerStatus = this.getPlayerStatus(rematchInitiatorId, currentUserId);
    const fnRenderBtn = this.mapRematchStateToButtons[`${rematchState}_${playerStatus}`]
      || this.mapRematchStateToButtons.none;
    return this[fnRenderBtn]();
  }
}

const mapStateToProps = state => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGame(state),
  };
};

export default connect(mapStateToProps)(RematchButton);
