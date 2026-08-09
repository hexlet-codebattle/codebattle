import React, { memo, useRef, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Button, Flex, Stack } from '@mantine/core';
import { useSelector } from 'react-redux';

import Modal from '@/components/CbModal';

import i18next from '../../../i18n';
import ModalCodes from '../../config/modalCodes';
import { startRoundTournament } from '../../middlewares/Room';
import { gameAwardSelector, gameStatusSelector, gameWaitTypeSelector } from '../../selectors';

let count = 0;

const startRound = () => {
  if (count === 0) {
    count += 1;
  } else {
    startRoundTournament();
  }
};

interface TournamentAwardModalProps {
  onlyShowAward?: boolean;
}

const TournamentAwardModal = NiceModal.create((params: TournamentAwardModalProps) => {
  const onlyShowAward = params?.onlyShowAward || false;

  const gameStatus = useSelector(gameStatusSelector);
  const award = useSelector(gameAwardSelector) as string | null;
  const waitType = useSelector(gameWaitTypeSelector);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const modal = useModal(ModalCodes.awardModal);

  useEffect(() => {
    if (!modal.visible && !onlyShowAward) {
      startRound();
    }

    if (modal.visible && !onlyShowAward) {
      submitBtnRef.current?.focus();
    }
  }, [modal.visible, onlyShowAward]);

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{i18next.t('Award')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Flex justify="center" p="sm">
          {gameStatus?.state !== 'playing' && (
            <Stack align="center">
              {award && award.startsWith('http') ? (
                <img
                  alt={i18next.t('Game award')}
                  src={award}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <span style={{ fontSize: '10rem' }}>{award}</span>
              )}
            </Stack>
          )}
        </Flex>
      </Modal.Body>
      {!onlyShowAward && (
        <Modal.Footer>
          <Button ref={submitBtnRef} radius="md" onClick={modal.hide}>
            {waitType === 'tournament' ? i18next.t('Close') : i18next.t('Next game')}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
});

export default memo(TournamentAwardModal);
