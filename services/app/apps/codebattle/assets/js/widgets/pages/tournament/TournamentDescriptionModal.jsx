import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import ModalCodes from '../../config/modalCodes';

const TournamentDescriptionModal = NiceModal.create(() => {
  const modal = useModal(ModalCodes.tournamentDescriptionModal);

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{i18next.t('Tournament description')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Instruction
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-end w-100">
          <Button
            onClick={modal.hide}
            className="btn btn-secondary text-white rounded-lg"
          >
            <FontAwesomeIcon icon="times" className="mr-2" />
            {i18next.t('Close')}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});
export default memo(TournamentDescriptionModal);
