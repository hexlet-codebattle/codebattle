import React from 'react';

import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { connect } from 'react-redux';

import i18n from '../../../i18n';
import {
  sendOfferToRematch,
  sendRejectToRematch,
  sendAcceptToRematch,
} from '../../middlewares/Game';
import * as selectors from '../../selectors';

const getPlayerStatus = (rematchInitiatorId, currentUserId) => {
  if (rematchInitiatorId === null) {
    return null;
  }
  return rematchInitiatorId === currentUserId ? 'initiator' : 'acceptor';
};

const RematchButton = ({
  currentUserId,
  disabled,
  gameStatus: { rematchInitiatorId, rematchState },
  isOpponentInGame,
}) => {
  const renderBtnAfterReject = () => (
    <button className="btn btn-danger btn-block" disabled={disabled} type="button">
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
      <button disabled className={classNames} type="button">
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
          title="Accept"
          type="button"
          onClick={sendAcceptToRematch}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
        <button
          className="btn btn-outline-secondary"
          title="Decline"
          type="button"
          onClick={sendRejectToRematch}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );

  const renderBtnByDefault = () => (
    <button
      className="btn btn-secondary btn-block rounded-lg"
      disabled={disabled}
      type="button"
      onClick={sendOfferToRematch}
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

  return (
    mapRematchStateToButtons[`${rematchState}_${playerStatus}`] || mapRematchStateToButtons.none
  );
};

const mapStateToProps = (state) => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGameSelector(state),
  };
};

export default connect(mapStateToProps)(RematchButton);
