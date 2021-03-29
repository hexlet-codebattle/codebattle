import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import * as selectors from '../selectors';
import { sendGiveUp, resetTextToTemplate } from '../middlewares/Game';
import { actions } from '../slices';

const CheckResultButton = ({ onClick, status }) => {
  const dispatch = useDispatch();

  switch (status) {
    case 'enabled':
      return (
        <button
          type="button"
          className="btn btn-outline-success btn-check btn-sm rounded"
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
          className="btn btn-outline-success btn-check btn-sm rounded"
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
          className="btn btn-outline-success btn-check btn-sm rounded"
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
          className="btn btn-outline-danger btn-sm rounded mr-2"
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
          className="btn btn-outline-danger btn-sm rounded mr-2"
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
          className="btn btn-outline-secondary btn-sm rounded mr-2"
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
          className="btn btn-outline-secondary btn-sm rounded mr-2"
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
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
}) => {
  const [modalShowing, setModalShowing] = useState(false);
  const dispatch = useDispatch();

  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(state)(currentUserId));

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
    dispatch(resetTextToTemplate(currentEditorLangSlug));
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
