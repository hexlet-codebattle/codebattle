import React, { useContext, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import { inTestingRoomSelector } from '../../machines/selectors';
import { sendGiveUp, resetTextToTemplateAndSend, resetTextToTemplate } from '../../middlewares/Game';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function CheckResultButton({ onClick, status }) {
  const dispatch = useDispatch();
  const commonProps = {
    type: 'button',
    className: 'btn btn-outline-success btn-check rounded-lg',
    title: 'Check solution&#013;Ctrl + Enter',
    onClick,
    'data-toggle': 'tooltip',
    'data-guide-id': 'CheckResultButton',
    'data-placement': 'top',
  };

  switch (status) {
    case 'enabled':
      return (
        <button type="button" {...commonProps}>
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="mr-2 success" />
          Run
        </button>
      );
    case 'checking':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon className="mr-2" icon="spinner" pulse />
          Running...
        </button>
      );
    case 'disabled':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="mr-2 success" />
          Run
        </button>
      );
    default: {
      dispatch(actions.setError(new Error('unnexpected check status')));
      return null;
    }
  }
}

function GiveUpButton({ onClick, status }) {
  const dispatch = useDispatch();
  const commonProps = {
    type: 'button',
    className: 'btn btn-outline-danger rounded-lg',
    title: 'Give Up',
    onClick,
    'data-toggle': 'tooltip',
    'data-placement': 'top',
    'data-guide-id': 'GiveUpButton',
  };

  switch (status) {
    case 'enabled':
      return (
        <button type="button" {...commonProps}>
          <FontAwesomeIcon icon={['far', 'flag']} />
        </button>
      );
    case 'disabled':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon={['far', 'flag']} />
        </button>
      );
    default: {
      dispatch(actions.setError(new Error('unnexpected give up status')));
      return null;
    }
  }
}

function ResetButton({ onClick, status }) {
  const dispatch = useDispatch();
  const commonProps = {
    type: 'button',
    className: 'btn btn-outline-secondary rounded-lg mx-1',
    title: 'Reset editor',
    onClick,
    'data-toggle': 'tooltip',
    'data-placement': 'top',
    'data-guide-id': 'ResetButton',
  };

  switch (status) {
    case 'enabled':
      return (
        <button type="button" {...commonProps}>
          <FontAwesomeIcon icon={['fas', 'sync']} />
        </button>
      );
    case 'disabled':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon={['fas', 'sync']} />
        </button>
      );
    default: {
      dispatch(actions.setError(new Error('unnexpected reset status')));
      return null;
    }
  }
}

function GameActionButtons({
  currentEditorLangSlug,
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
  showGiveUpBtn,
}) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const isTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);

  const [modalShowing, setModalShowing] = useState(false);

  const modalHide = () => {
    setModalShowing(false);
  };

  const modalShow = () => {
    setModalShowing(true);
  };

  const handleGiveUp = () => {
    modalHide();
    sendGiveUp();
  };

  const handleReset = () => {
    if (isTestingRoom) {
      dispatch(resetTextToTemplate(currentEditorLangSlug));
    } else {
      dispatch(resetTextToTemplateAndSend(currentEditorLangSlug));
    }
  };

  const renderModal = () => (
    <Modal show={modalShowing} onHide={modalHide}>
      <Modal.Body className="text-center">
        Are you sure you want to give up?
      </Modal.Body>
      <Modal.Footer className="mx-auto">
        <Button onClick={handleGiveUp} className="btn-danger rounded-lg">Give up</Button>
        <Button onClick={modalHide} className="btn-secondary rounded-lg">Cancel</Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="btn-group btn-group-sm py-2 mr-2" role="group" aria-label="Game actions">
      {showGiveUpBtn && <GiveUpButton onClick={modalShow} status={giveUpBtnStatus} />}
      <ResetButton onClick={handleReset} status={resetBtnStatus} />
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      {renderModal()}
    </div>
  );
}

export default GameActionButtons;
