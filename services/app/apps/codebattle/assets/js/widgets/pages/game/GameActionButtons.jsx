import React, { useContext, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import RoomContext from '../../components/RoomContext';
import { sendGiveUp, resetTextToTemplateAndSend, resetTextToTemplate } from '../../middlewares/Game';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import { inTestingRoomSelector } from '../../machines/selectors';

const CheckResultButton = ({ onClick, status }) => {
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
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="success" />
        </button>
      );
    case 'checking':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon="spinner" pulse />
        </button>
      );
    case 'disabled':
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="success" />
        </button>
      );
    default: {
      dispatch(actions.setError(new Error('unnexpected check status')));
      return null;
    }
  }
};

const GiveUpButton = ({ onClick, status }) => {
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
};

const ResetButton = ({ onClick, status }) => {
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
};

const GameActionButtons = ({
  currentEditorLangSlug,
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
}) => {
  const [modalShowing, setModalShowing] = useState(false);
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const isTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);

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
        <Button onClick={handleGiveUp} className="btn-danger">Give up</Button>
        <Button onClick={modalHide} className="btn-secondary">Cancel</Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="py-2 mr-2" role="toolbar">
      <GiveUpButton onClick={modalShow} status={giveUpBtnStatus} />
      <ResetButton onClick={handleReset} status={resetBtnStatus} />
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      {renderModal()}
    </div>
  );
};

export default GameActionButtons;
