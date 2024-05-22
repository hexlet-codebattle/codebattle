import React, { memo, useRef, useEffect } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import i18next from 'i18next';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import ModalCodes from '../../config/modalCodes';
import { startRoundTournament } from '../../middlewares/Room';
import {
  gameAwardSelector, gameStatusSelector, gameWaitTypeSelector,
} from '../../selectors';

let count = 0;

const startRound = () => {
  if (count === 0) {
    count += 1;
  } else {
    startRoundTournament();
  }
};

const TournamentAwardModal = NiceModal.create(params => {
  const onlyShowAward = params?.onlyShowAward || false;

  const gameStatus = useSelector(gameStatusSelector);
  const award = useSelector(gameAwardSelector);
  const waitType = useSelector(gameWaitTypeSelector);
  const submitBtnRef = useRef(null);

  const modal = useModal(ModalCodes.awardModal);

  useEffect(() => {
    if (!modal.visible && !onlyShowAward) {
      startRound();
    }

    if (modal.visible && !onlyShowAward) {
      submitBtnRef.current.focus();
    }
  }, [modal.visible, onlyShowAward]);

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{i18next.t('Award')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-row justify-content-center p-2">
          {gameStatus?.state !== 'playing' && (
            <div className="d-flex flex-column align-items-center">
              {award && award.startsWith('http') ? (
                <img
                  alt="Game award"
                  src={award}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <span style={{ fontSize: '10rem' }}>{award}</span>
              )}
            </div>
          )}
        </div>
      </Modal.Body>
      {!onlyShowAward && (
        <Modal.Footer>
          <div className="d-flex justify-content-end w-100">
            <Button
              ref={submitBtnRef}
              className="btn btn-primary rounded-lg"
              onClick={modal.hide}
            >
              {waitType === 'tournament'
                ? i18next.t('Close')
                : i18next.t('Next game')}
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
});

export default memo(TournamentAwardModal);
