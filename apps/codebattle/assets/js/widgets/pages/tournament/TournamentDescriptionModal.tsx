import React, { memo, useContext } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@mantine/core';
import i18next from 'i18next';

import Modal from '@/components/CbModal';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import ModalCodes from '../../config/modalCodes';

interface TournamentDescriptionModalProps {
  description?: React.ReactNode;
}

const TournamentDescriptionModal = NiceModal.create(
  ({ description }: TournamentDescriptionModalProps) => {
    const modal = useModal(ModalCodes.tournamentDescriptionModal);

    const hasCustomEventStyle = useContext(CustomEventStylesContext);

    const closeBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;

    return (
      <Modal
        contentClassName="cb-text"
        centered
        show={modal.visible}
        onHide={modal.hide}
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18next.t('Tournament description')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{description}</Modal.Body>
        <Modal.Footer className="cb-border-color">
          <div className="d-flex justify-content-end w-100">
            <Button
              onClick={modal.hide}
              color="cbSecondary"
              radius="md"
              className={closeBtnClassName}
              leftSection={<FontAwesomeIcon icon="times" />}
            >
              {i18next.t('Close')}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  },
);
export default memo(TournamentDescriptionModal);
