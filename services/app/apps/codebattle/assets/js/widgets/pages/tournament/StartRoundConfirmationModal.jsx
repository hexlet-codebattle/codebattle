import React, {
  useCallback,
  useRef,
  memo,
  useContext,
} from 'react';

import cn from 'classnames';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';

import {
  startTournament as handleStartTournament,
  startRoundTournament as handleStartRoundTournament,
} from '../../middlewares/TournamentAdmin';

import StageTitle from './StageTitle';

const getModalTittle = type => {
  switch (type) {
    case 'firstRound': return 'Start tournament confirmation';
    case 'nextRound': return 'Start next round';
    default: return '';
  }
};

const getModalText = type => {
  switch (type) {
    case 'firstRound': return 'Are you sure you want to start the tournament?';
    case 'nextRound': return 'Are you sure you want to start the round?';
    default: return '';
  }
};

const getSelectedRound = (type, currentRoundPosition) => {
  switch (type) {
    case 'firstRound': return currentRoundPosition;
    case 'nextRound': return currentRoundPosition + 1;
    default: return '';
  }
};

function StartRoundConfirmationModal({
  meta,
  currentRoundPosition,
  matchTimeoutSeconds,
  level,
  taskPackName,
  taskProvider,
  modalShowing,
  onClose,
}) {
  const confirmBtnRef = useRef(null);

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const cancelBtnClassName = cn('btn rounded-lg', {
    'btn-secondary': !hasCustomEventStyle,
    'cb-custom-event-btn-secondary': hasCustomEventStyle,
  });
  const confirmBtnClassName = cn('btn text-white rounded-lg', {
    'btn-success': !hasCustomEventStyle,
    'cb-custom-event-btn-success': hasCustomEventStyle,
  });

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
  const selectedRound = getSelectedRound(modalShowing, currentRoundPosition);

  return (
    <Modal show={!!modalShowing} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          className="d-flex flex-column justify-content-between align-items-center"
        >
          <h4 className="mb-4">{text}</h4>
          <div className="d-flex flex-column justify-content-center">
            {meta.roundsConfigType === 'per_round' ? (
              meta.roundsConfig.map((config, index) => {
                const textClassName = cn({
                  'font-weight-bold': index === selectedRound,
                });

                return (
                  <div className={textClassName}>
                    <span className="mr-4">
                      <StageTitle stage={index} stagesLimit={meta.roundsLimit} />
                    </span>
                    <span title="Round timeout seconds" className="mr-2">
                      {'Seconds: '}
                      {config.roundTimeoutSeconds}
                      {', '}
                    </span>
                    {config.taskPackId && (
                      <span title="Round task pack id">
                        {'Task pack id: '}
                        {config.taskPackId}
                      </span>
                    )}
                    {config.level && (
                      <span title="Round task level">
                        {'Task level: '}
                        {config.taskLevel}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="d-flex justify-content-center">
                <span title="Round timeout seconds" className="mr-2">
                  {'Seconds: '}
                  {matchTimeoutSeconds}
                  {', '}
                </span>
                {taskProvider === 'task_pack' && (
                  <span title="Round task pack id">
                    {'Task pack name: '}
                    {taskPackName}
                  </span>
                )}
                {taskProvider === 'level' && (
                  <span title="Round task level">
                    {'Task level: '}
                    {level}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <Button onClick={onClose} className={cancelBtnClassName}>
            Cancel
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className={confirmBtnClassName}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(StartRoundConfirmationModal);
