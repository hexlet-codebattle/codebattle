import React, { memo, useCallback } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import i18n from 'i18next';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import ModalCodes from '../../config/modalCodes';
import {
  currentUserIdSelector,
  gameAwardSelector,
  gameVisibleSelector,
} from '../../selectors';

const getStatusClassName = status => {
  switch (status) {
    case 'timeout':
    case 'error':
      return 'text-danger h3';
    case 'failure':
      return 'text-warning h3';
    case 'ok':
      return 'text-success h3';
    default:
      return 'text-muted h3';
  }
};

const getStatusMessage = status => {
  switch (status) {
    case 'timeout':
      return i18n.t('Execution Timeout');
    case 'error':
      return i18n.t('Error');
    case 'failure':
      return i18n.t('Tests failed');
    case 'ok':
      return i18n.t('Tests passed');
    default:
      return i18n.t('None');
  }
};

const getAwardMessageClassName = award => {
  switch (award) {
    case 'blue': return 'text-primary h4';
    case 'red': return 'text-danger h4';
    default: return '?';
  }
};

const getAwardMessage = award => {
  switch (award) {
    case 'blue': return 'Cut blue wire';
    case 'red': return 'Cut red wire';
    default: return '?';
  }
};

const randNumb = Math.random();

const getOppositeAward = award => {
  if (randNumb < 0.5) {
    return award;
  }

  switch (award) {
    case 'blue': return 'red';
    case 'red': return 'blue';
    default: return '?';
  }
};

const TournamentAwardModal = NiceModal.create(() => {
  const award = useSelector(gameAwardSelector);
  const gameVisible = useSelector(gameVisibleSelector);
  const currentUserId = useSelector(currentUserIdSelector);
  const output = useSelector(state => state.executionOutput.results[currentUserId]);

  const modal = useModal(ModalCodes.awardModal);

  const awardResult = output?.status === 'ok' || gameVisible
    ? award
    : getOppositeAward(award);

  const onHide = useCallback(() => {
    if (gameVisible) {
      modal.hide();
    }
  }, [gameVisible, modal]);

  return (
    <Modal centered show={modal.visible} onHide={onHide}>
      <Modal.Header closeButton={gameVisible}>
        <Modal.Title>Award</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-row justify-content-between p-2">
          <div className="d-flex flex-column align-items-center">
            <span className="h3">
              Solution status:
            </span>
            {gameVisible ? (
              <span
                className={getStatusClassName(output?.status)}
              >
                {getStatusMessage(output?.status)}
              </span>
            ) : (
              <span
                className="text-muted border py-3 bg-gray rounded-lg w-50"
              >
                {'         '}
              </span>
            )}
          </div>
          <div
            className="d-flex flex-column align-items-center"
          >
            <span className="h3">
              Instructions:
            </span>
            <span
              className={getAwardMessageClassName(awardResult)}
            >
              {getAwardMessage(awardResult)}
            </span>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
});

export default memo(TournamentAwardModal);
