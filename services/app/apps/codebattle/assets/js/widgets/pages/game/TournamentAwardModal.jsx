import React, { memo, useCallback } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
// import i18n from 'i18next';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import ModalCodes from '../../config/modalCodes';
import {
  // currentUserIdSelector,
  gameAwardSelector,
  gameVisibleSelector,
} from '../../selectors';

const TournamentAwardModal = NiceModal.create(() => {
  const award = useSelector(gameAwardSelector);
  const gameVisible = useSelector(gameVisibleSelector);
  // const currentUserId = useSelector(currentUserIdSelector);
  // const output = useSelector(state => state.executionOutput.results[currentUserId]);

  const modal = useModal(ModalCodes.awardModal);

  const onHide = useCallback(() => {
    if (gameVisible) {
      modal.hide();
    }
  }, [gameVisible, modal]);

  return (
    <Modal centered show={modal.visible} onHide={onHide}>
      <Modal.Header closeButton={gameVisible}>
        <Modal.Title>Award</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-row justify-content-center p-2">
          <div className="d-flex flex-column align-items-center">
            {award && award.startsWith('http') ? (
              <img alt={award} src={award} style={{ width: '100%', height: '100%' }} />
            ) : (
              <span style={{ fontSize: '10rem' }}>{award}</span>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
});

export default memo(TournamentAwardModal);
