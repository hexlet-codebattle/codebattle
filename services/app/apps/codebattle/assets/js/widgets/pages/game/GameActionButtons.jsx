import React, { useContext, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import { inTestingRoomSelector } from '../../machines/selectors';
import {
  sendGiveUp,
  resetTextToTemplateAndSend,
  resetTextToTemplate,
} from '../../middlewares/Game';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function CheckResultButton({ onClick, status }) {
  const dispatch = useDispatch();
  const commonProps = {
    className: 'btn btn-outline-success btn-check btn-sm rounded-right',
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
          <FontAwesomeIcon className="success" icon={['fas', 'play-circle']} />
        </button>
      );
    case 'checking':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon pulse icon="spinner" />
        </button>
      );
    case 'disabled':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon className="success" icon={['fas', 'play-circle']} />
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
    className: 'btn btn-outline-danger btn-sm rounded-left',
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
    className: 'btn btn-outline-secondary btn-sm mx-1',
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
  checkBtnStatus,
  checkResult,
  currentEditorLangSlug,
  giveUpBtnStatus,
  resetBtnStatus,
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
      <Modal.Body className="text-center">Are you sure you want to give up?</Modal.Body>
      <Modal.Footer className="mx-auto">
        <Button className="btn-danger rounded-lg" onClick={handleGiveUp}>
          Give up
        </Button>
        <Button className="btn-secondary rounded-lg" onClick={modalHide}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="py-2 mr-2" role="toolbar">
      <GiveUpButton status={giveUpBtnStatus} onClick={modalShow} />
      <ResetButton status={resetBtnStatus} onClick={handleReset} />
      <CheckResultButton status={checkBtnStatus} onClick={checkResult} />
      {renderModal()}
    </div>
  );
}

export default GameActionButtons;
