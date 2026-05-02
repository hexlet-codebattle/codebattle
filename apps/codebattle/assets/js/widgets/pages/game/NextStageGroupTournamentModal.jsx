import React, { memo, useEffect } from "react";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import i18n from "i18next";
import Button from "react-bootstrap/Button";

import Modal from "@/components/BootstrapModal";

import ModalCodes from "../../config/modalCodes";

const NextStageGroupTournamentModal = NiceModal.create(({ groupTournamentId, bodyText }) => {
  const modal = useModal(ModalCodes.nextStageGroupTournamentModal);

  useEffect(() => {
    if (modal.visible) {
      NiceModal.hide(ModalCodes.gameResultModal);
      NiceModal.hide(ModalCodes.tournamentStatisticsModal);
      NiceModal.hide(ModalCodes.premiumRestrictionModal);
      NiceModal.hide(ModalCodes.taskDescriptionModal);
      NiceModal.hide(ModalCodes.awardModal);
    }
  }, [modal.visible]);

  if (!groupTournamentId) {
    return null;
  }

  const href = `/group_tournaments/${groupTournamentId}`;
  const text =
    bodyText ||
    i18n.t("Your next step is the AI-round group tournament. Click the button below to continue.");

  return (
    <Modal centered show={modal.visible} onHide={modal.hide} contentClassName="cb-bg-panel cb-text">
      <Modal.Header closeButton>
        <Modal.Title>{i18n.t("Tournament finished")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{text}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={modal.hide}>
          {i18n.t("Close")}
        </Button>
        <Button as="a" href={href} variant="primary">
          {i18n.t("Go to AI-round group tournament")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(NextStageGroupTournamentModal);
