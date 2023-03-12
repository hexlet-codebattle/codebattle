import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

import * as selectors from '../../selectors';
import i18n from '../../../i18n';
import {
  sendOfferToRematch,
  sendRejectToRematch,
  sendAcceptToRematch,
} from '../../middlewares/Game';

const getPlayerStatus = (rematchInitiatorId, currentUserId) => {
  if (rematchInitiatorId === null) {
    return null;
  }
  return rematchInitiatorId === currentUserId ? 'initiator' : 'acceptor';
};

const RematchButton = ({
  gameStatus: { rematchState, rematchInitiatorId },
  currentUserId,
  isOpponentInGame,
  disabled,
}) => {
  const renderBtnAfterReject = () => (
    <button
      type="button"
      className="btn btn-danger btn-block"
      disabled={disabled}
    >
      {i18n.t('Rejected Offer')}
    </button>
  );

  const renderBtnAfterSendOffer = () => {
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

  const renderBtnAfterRecieveOffer = () => (
    <div className="d-flex flex-nowrap mb-3 w-100">
      <div className="flex-grow-1 border py-1 px-2 text-center">Rematch?</div>
      <div className="d-flex">
        <button
          className="btn btn-outline-secondary mr-1"
          type="button"
          onClick={sendAcceptToRematch}
          title="Accept"
        >
          <FontAwesomeIcon
            icon={faCheck}
          />
        </button>
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={sendRejectToRematch}
          title="Decline"
        >
          <FontAwesomeIcon
            icon={faXmark}
          />
        </button>
      </div>
    </div>
  );

  const renderBtnByDefault = () => (
    <button
      type="button"
      className="btn btn-secondary btn-block"
      onClick={sendOfferToRematch}
      disabled={disabled}
    >
      {disabled ? i18n.t('Opponent has left') : i18n.t('Rematch')}
    </button>
  );

  const mapRematchStateToButtons = {
    in_approval_initiator: renderBtnAfterSendOffer(),
    in_approval_acceptor: renderBtnAfterRecieveOffer(),
    rejected_initiator: renderBtnAfterReject(),
    rejected_acceptor: renderBtnAfterReject(),
    none: renderBtnByDefault(),
  };

  const playerStatus = getPlayerStatus(rematchInitiatorId, currentUserId);

  return mapRematchStateToButtons[`${rematchState}_${playerStatus}`]
    || mapRematchStateToButtons.none;
};

const mapStateToProps = state => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGameSelector(state),
  };
};

export default connect(mapStateToProps)(RematchButton);
