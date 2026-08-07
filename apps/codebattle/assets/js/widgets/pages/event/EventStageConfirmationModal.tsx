import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';

import Modal from '@/components/CbModal';

import ModalCodes from '../../config/modalCodes';

interface EventStageConfirmationModalProps {
  titleModal: React.ReactNode;
  buttonText: React.ReactNode;
  bodyText: React.ReactNode;
  url: string;
}

const EventStageConfirmationModal = NiceModal.create<EventStageConfirmationModalProps>(
  ({ titleModal, buttonText, bodyText, url }) => {
    const modal = useModal(ModalCodes.eventStageModal);

    return (
      <Modal contentClassName="cb-text" show={modal.visible} onHide={modal.hide}>
        <Modal.Header closeButton>
          <Modal.Title>{titleModal}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-white">{bodyText}</div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-warning"
            data-method="post"
            data-csrf={window.csrf_token}
            data-to={url}
          >
            {buttonText}
          </button>
        </Modal.Footer>
      </Modal>
    );
  },
);

export default memo(EventStageConfirmationModal);
