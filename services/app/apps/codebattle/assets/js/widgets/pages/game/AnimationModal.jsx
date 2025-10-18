import React, { memo, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import i18n from 'i18next';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import Loading from '@/components/Loading';

import gifs from '../../config/gifs';
import ModalCodes from '../../config/modalCodes';
import { gamePlayersSelector, currentUserIdSelector } from '../../selectors';

function TournamentInfoPanel() {
  const waitType = useSelector(state => state.game.waitType);

  switch (waitType) {
    case 'tournament': return i18n.t('Tournament is over');
    case 'round': return i18n.t('Round is over, wait for the next round');
    case 'rematch': return (
      <div className="d-flex flex-row">
        <Loading adaptive />
        <span className="pl-2">{i18n.t('Loading next game')}</span>
      </div>
    );
    default: return <></>;
  }
}

const AnimationModal = NiceModal.create(() => {
  const modal = useModal(ModalCodes.gameResultModal);

  const players = useSelector(state => gamePlayersSelector(state));
  const currentUserId = useSelector(state => currentUserIdSelector(state));
  const tournamentId = useSelector(state => state.game.gameStatus.tournamentId);

  useEffect(() => {
    if (modal.visible) {
      NiceModal.hide(ModalCodes.premiumRestrictionModal);
      NiceModal.hide(ModalCodes.taskDescriptionModal);
    }
  }, [modal.visible]);

  const currentPlayer = players[currentUserId];

  if (!currentPlayer || currentPlayer.result === 'undefined') {
    return null;
  }

  const { result } = currentPlayer;

  const titleModal = result === 'won'
    ? i18n.t("Woohoo, you're Champion!!!!!")
    : i18n.t("If you read this you've lost the game");
  const buttonText = result === 'won' ? i18n.t('GG') : i18n.t("I'll be back");

  return (
    <Modal
      show={modal.visible}
      onHide={modal.hide}
      contentClassName="cb-bg-panel cb-text"
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{titleModal}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-center">
          <img
            className="w-100 cb-rounded"
            style={{ maxWidth: '400px' }}
            src={gifs[result]}
            alt="animation"
          />
        </div>
        {tournamentId && (
          <div className="d-flex text-center text-white justify-content-center">
            <span className="py-2 h4">
              <TournamentInfoPanel />
            </span>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {/* {tournamentId && ( */}
        {/*   <a */}
        {/*     href={`/tournaments/${tournamentId}`} */}
        {/*     className="btn-link pr-2 cb-rounded" */}
        {/*   > */}
        {/*     Back to tournament */}
        {/*   </a> */}
        {/* )} */}
        <Button onClick={modal.hide} className="btn btn-secondary cb-btn-secondary cb-rounded">
          {buttonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(AnimationModal);
