import React, {
  useCallback,
  useRef,
  memo,
} from 'react';

import cn from 'classnames';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import {
  startTournament as handleStartTournament,
  startRoundTournament as handleStartRoundTournament,
} from '../../middlewares/Tournament';

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

const getSelectedRound = (type, currentRound) => {
  switch (type) {
    case 'firstRound': return currentRound;
    case 'nextRound': return currentRound + 1;
    default: return '';
  }
};

function StartRoundConfirmationModal({
  meta,
  currentRound,
  matchTimeoutSeconds,
  level,
  taskPackName,
  taskProvider,
  modalShowing,
  onClose,
}) {
  const confirmBtnRef = useRef(null);

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
  const selectedRound = getSelectedRound(modalShowing, currentRound);

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
          <Button onClick={onClose} className="btn btn-secondary rounded-lg">
            Cancel
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className="btn btn-success text-white rounded-lg"
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
