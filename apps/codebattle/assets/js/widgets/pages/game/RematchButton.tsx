import React from 'react';

import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { connect } from 'react-redux';

import { type RootState } from '@/slices';

import i18n from '../../../i18n';
import {
  sendOfferToRematch,
  sendRejectToRematch,
  sendAcceptToRematch,
} from '../../middlewares/Room';
import * as selectors from '../../selectors';

const getPlayerStatus = (rematchInitiatorId: number | null, currentUserId: number | null) => {
  if (rematchInitiatorId === null) {
    return null;
  }
  return rematchInitiatorId === currentUserId ? 'initiator' : 'acceptor';
};

interface RematchButtonProps {
  gameStatus: {
    rematchState: string | null;
    rematchInitiatorId: number | null;
  };
  currentUserId: number | null;
  isOpponentInGame: boolean;
  disabled?: boolean;
}

const RematchButton = ({
  gameStatus: { rematchState, rematchInitiatorId },
  currentUserId,
  isOpponentInGame,
  disabled,
}: RematchButtonProps) => {
  const renderBtnAfterReject = () => (
    <button type="button" className="btn btn-danger btn-block" disabled={disabled}>
      {i18n.t('Rejected Offer')}
    </button>
  );

  const renderBtnAfterSendOffer = () => {
    const text = isOpponentInGame ? 'Wait For An Answer...' : 'Opponent Left The Game';
    const classNames = cn('btn btn-block', {
      'btn-secondary cb-btn-secondary': isOpponentInGame,
      'btn-warning': !isOpponentInGame,
    });
    return (
      <button type="button" className={classNames} disabled>
        {i18n.t(text)}
      </button>
    );
  };

  const renderBtnAfterRecieveOffer = () => (
    <div className="d-flex flex-nowrap mb-3 w-100">
      <div className="flex-grow-1 border py-1 px-2 text-center">{i18n.t('Rematch?')}</div>
      <div className="d-flex">
        <button
          className="btn btn-outline-secondary cb-btn-outline-secondary mr-1"
          type="button"
          onClick={sendAcceptToRematch}
          title={i18n.t('Accept')}
          aria-label={i18n.t('Accept')}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
        <button
          className="btn btn-outline-secondary cb-btn-outline-secondary"
          type="button"
          onClick={sendRejectToRematch}
          title={i18n.t('Decline')}
          aria-label={i18n.t('Decline')}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );

  const renderBtnByDefault = () => (
    <button
      type="button"
      className="btn btn-secondary cb-btn-secondary btn-block cb-rounded"
      onClick={sendOfferToRematch}
      disabled={disabled}
    >
      {disabled ? i18n.t('Opponent has left') : i18n.t('Rematch')}
    </button>
  );

  const mapRematchStateToButtons: Record<string, React.ReactNode> = {
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

const mapStateToProps = (state: RootState) => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGameSelector(state),
  };
};

export default connect(mapStateToProps)(RematchButton);
