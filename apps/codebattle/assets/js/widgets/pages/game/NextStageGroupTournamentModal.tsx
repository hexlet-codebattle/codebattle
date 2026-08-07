import React, { memo, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Button } from '@mantine/core';
import i18n from 'i18next';

import Modal from '@/components/CbModal';

import ModalCodes from '../../config/modalCodes';

interface NextStageGroupTournamentModalProps {
  groupTournamentId?: number;
}

const NextStageGroupTournamentModal = NiceModal.create(
  ({ groupTournamentId }: NextStageGroupTournamentModalProps) => {
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
    const headerText = i18n.t('First qualification round finished');
    const bodyText = i18n.t(
      'Your next step is the AI-round group tournament. Click the button below to continue.',
    );

    return (
      <Modal
        centered
        show={modal.visible}
        backdrop="static"
        keyboard={false}
        contentClassName="cb-bg-panel cb-text"
      >
        <Modal.Header closeButton>
          <Modal.Title>{headerText}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 text-white">{bodyText}</p>
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="secondary" onClick={modal.hide}> */}
          {/*   {i18n.t("Later")} */}
          {/* </Button> */}
          <Button component="a" href={href} color="blue" radius="md">
            {i18n.t('Go to AI-round group tournament')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
);

export default memo(NextStageGroupTournamentModal);
