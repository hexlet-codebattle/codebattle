import React, { useCallback, useRef, memo, useContext } from 'react';

import { Button } from '@mantine/core';

import Modal from '@/components/CbModal';
import CustomEventStylesContext from '@/components/CustomEventStylesContext';

import i18n from '../../../i18n';
import {
  startTournament as handleStartTournament,
  startRoundTournament as handleStartRoundTournament,
} from '../../middlewares/TournamentAdmin';

const getModalTittle = (type: string | boolean) => {
  switch (type) {
    case 'firstRound':
      return i18n.t('Start tournament confirmation');
    case 'nextRound':
      return i18n.t('Start next round');
    default:
      return '';
  }
};

const getModalText = (type: string | boolean) => {
  switch (type) {
    case 'firstRound':
      return i18n.t('Are you sure you want to start the tournament?');
    case 'nextRound':
      return i18n.t('Are you sure you want to start the round?');
    default:
      return '';
  }
};

interface StartRoundConfirmationModalProps {
  matchTimeoutSeconds?: number;
  level?: string;
  taskPackName?: string;
  taskProvider?: string;
  modalShowing: string | boolean;
  onClose: () => void;
}

function StartRoundConfirmationModal({
  matchTimeoutSeconds,
  level,
  taskPackName,
  taskProvider,
  modalShowing,
  onClose,
}: StartRoundConfirmationModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const cancelBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;
  const confirmBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-success' : undefined;

  const handleConfirmation = useCallback(() => {
    switch (modalShowing) {
      case 'firstRound': {
        handleStartTournament();
        break;
      }
      case 'nextRound': {
        handleStartRoundTournament();
        break;
      }
      default: {
        break;
      }
    }

    onClose();
  }, [modalShowing, onClose]);

  const title = getModalTittle(modalShowing);
  const text = getModalText(modalShowing);

  return (
    <Modal show={!!modalShowing} onHide={onClose} contentClassName="cb-text">
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="cb-border-color">
        <div className="d-flex flex-column justify-content-between align-items-center">
          <h4 className="mb-4">{text}</h4>
          <div className="d-flex flex-column justify-content-center">
            <div className="d-flex justify-content-center">
              <span title={i18n.t('Round timeout seconds')} className="mr-2">
                {i18n.t('Seconds:')} {matchTimeoutSeconds}
                {', '}
              </span>
              {taskProvider === 'task_pack' && (
                <span title={i18n.t('Round task pack id')}>
                  {i18n.t('Task pack name:')} {taskPackName}
                </span>
              )}
              {taskProvider === 'level' && (
                <span title={i18n.t('Round task level')}>
                  {i18n.t('Task level:')} {level ? i18n.t(level) : level}
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-between w-100">
          <Button onClick={onClose} color="cbSecondary" radius="md" className={cancelBtnClassName}>
            {i18n.t('Cancel')}
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              color="cbSuccess"
              radius="md"
              className={confirmBtnClassName}
            >
              {i18n.t('Confirm')}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(StartRoundConfirmationModal);
