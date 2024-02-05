import React, { memo, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
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
    case 'tournament': return 'Tournament is over';
    case 'round': return 'Round is over, wait for the next round';
    case 'rematch': return (
      <div className="d-flex flex-row">
        <Loading adaptive />
        <span className="pl-2">Loading next game</span>
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

  const currentPlayer = players[currentUserId];

  if (!currentPlayer || currentPlayer.result === 'undefined') {
    return null;
  }

  const { result } = currentPlayer;

  const titleModal = result === 'won'
    ? "Woohoo, you're Champion!!!!!"
    : "If you read this you've lost the game";
  const buttonText = result === 'won' ? 'Thanks' : "I'll be back";

  useEffect(() => {
    if (modal.visible) {
      NiceModal.hide(ModalCodes.premiumRestrictionModal);
      NiceModal.hide(ModalCodes.taskDescriptionModal);
    }
  }, [modal.visible]);

  return (
    <Modal show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{titleModal}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-center">
          <img
            className="w-100 rounded-lg"
            style={{ maxWidth: '400px', height: '300px' }}
            src={gifs[result]}
            alt="animation"
          />
        </div>
        {tournamentId && (
          <div className="d-flex text-center justify-content-center">
            <span className="py-2 h4">
              <TournamentInfoPanel />
            </span>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {/* {tournamentId && ( */}
        {/*   <a */}
        {/*     href={`/tournaments/${tournamentId}`} */}
        {/*     className="btn-link pr-2 rounded-lg" */}
        {/*   > */}
        {/*     Back to tournament */}
        {/*   </a> */}
        {/* )} */}
        <Button onClick={modal.hide} className="btn btn-secondary rounded-lg">
          {buttonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(AnimationModal);
