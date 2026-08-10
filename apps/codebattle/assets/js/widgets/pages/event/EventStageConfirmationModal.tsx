import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';

import { Button, Text } from '@mantine/core';

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
          <Text c="white">{bodyText}</Text>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            color="yellow"
            data-method="post"
            data-csrf={window.csrf_token}
            data-to={url}
          >
            {buttonText}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
);

export default memo(EventStageConfirmationModal);
