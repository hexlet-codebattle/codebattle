import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import ModalCodes from '../../config/modalCodes';
import {
  gameAwardSelector,
} from '../../selectors';

const TournamentAwardModal = NiceModal.create(() => {
  const award = useSelector(gameAwardSelector);

  const modal = useModal(ModalCodes.awardModal);

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>Award</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-row justify-content-center p-2">
          <div className="d-flex flex-column align-items-center">
            {award && award.startsWith('http') ? (
              <img
                alt="Game award"
                src={award}
                style={{ width: '100%', height: '100%' }}
              />
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
