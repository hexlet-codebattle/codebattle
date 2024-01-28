import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import {
  gameAwardSelector,
} from '@/selectors';

import ModalCodes from '../../config/modalCodes';

const TournamentAwardModal = NiceModal.create(() => {
  const award = useSelector(gameAwardSelector);

  const modal = useModal(ModalCodes.awardModal);

  return (
    <Modal centered show={modal.visible}>
      <Modal.Header>
        <Modal.Title>Award</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {award}
      </Modal.Body>
    </Modal>
  );
});

export default memo(TournamentAwardModal);
