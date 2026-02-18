import React, { memo } from "react";

import NiceModal, { useModal } from "@ebay/nice-modal-react";

import Modal from "@/components/BootstrapModal";

import ModalCodes from "../../config/modalCodes";

const EventStageConfirmationModal = NiceModal.create(
  ({ titleModal, buttonText, bodyText, url }) => {
    const modal = useModal(ModalCodes.eventStageModal);

    return (
      <Modal contentClassName="cb-bg-panel cb-text" show={modal.visible} onHide={modal.hide}>
        <Modal.Header closeButton>
          <Modal.Title>{titleModal}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted">{bodyText}</div>
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
