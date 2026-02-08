import React, { memo, useContext } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import Button from 'react-bootstrap/Button';

import Modal from '@/components/BootstrapModal';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import ModalCodes from '../../config/modalCodes';

const TournamentDescriptionModal = NiceModal.create(({ description }) => {
  const modal = useModal(ModalCodes.tournamentDescriptionModal);

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const closeBtnClassName = cn('btn text-white rounded-lg', {
    'btn-secondary cb-btn-secondary': !hasCustomEventStyle,
    'cb-custom-event-btn-secondary': hasCustomEventStyle,
  });

  return (
    <Modal contentClassName="cb-bg-panel cb-text" centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{i18next.t('Tournament description')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {description}
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-end w-100">
          <Button
            onClick={modal.hide}
            className={closeBtnClassName}
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
