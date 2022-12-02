import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import { sendGiveUp, resetTextToTemplate } from '../middlewares/Game';
import { actions } from '../slices';

const CheckResultButton = ({ onClick, status }) => {
  const dispatch = useDispatch();

  switch (status) {
    case 'enabled':
      return (
        <button
          type="button"
          className="btn btn-outline-success btn-check btn-sm"
          data-guide-id="CheckResultButton"
          onClick={onClick}
          data-toggle="tooltip"
          data-placement="top"
          title="Check solution&#013;Ctrl + Enter"
        >
          <FontAwesomeIcon icon={['fas', 'play-circle']} className="success" />
        </button>
      );
    case 'checking':
      return (
        <button
          type="button"
          className="btn btn-outline-success btn-check btn-sm"
          data-guide-id="CheckResultButton"
          onClick={onClick}
          data-toggle="tooltip"
          data-placement="top"
          title="Check solution&#013;Ctrl + Enter"
          disabled
        >
          <FontAwesomeIcon icon="spinner" pulse />
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-outline-success btn-check btn-sm"
          data-guide-id="CheckResultButton"
          onClick={onClick}
          data-toggle="tooltip"
          data-placement="top"
          title="Check solution&#013;Ctrl + Enter"
          disabled
        >
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

  switch (status) {
    case 'enabled':
      return (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm mr-2"
          data-guide-id="GiveUpButton"
          onClick={onClick}
          data-toggle="tooltip"
          data-placement="top"
          title="Give Up"
        >
          <FontAwesomeIcon icon={['far', 'flag']} />
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm mr-2"
          data-guide-id="GiveUpButton"
          data-toggle="tooltip"
          data-placement="top"
          title="Give Up"
          disabled
        >
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

  switch (status) {
    case 'enabled':
      return (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm mr-2"
          data-guide-id="ResetButton"
          onClick={onClick}
          data-toggle="tooltip"
          data-placement="top"
          title="Reset editor"
        >
          <FontAwesomeIcon icon={['fas', 'sync']} />
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm mr-2"
          data-guide-id="ResetButton"
          data-toggle="tooltip"
          data-placement="top"
          title="Reset editor"
          disabled
        >
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
  onReset,
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
}) => {
  const [modalShowing, setModalShowing] = useState(false);
  const dispatch = useDispatch();

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
    const temaplate = dispatch(resetTextToTemplate(currentEditorLangSlug));
    onReset(temaplate)
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
