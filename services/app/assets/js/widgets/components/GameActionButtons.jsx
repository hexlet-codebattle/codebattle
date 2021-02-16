import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../i18n';
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
          className="btn btn-success"
          data-guide-id="CheckResultButton"
          onClick={onClick}
        >
          <FontAwesomeIcon icon="play-circle" />
          {` ${i18n.t('Check')}`}
          <small> (ctrl+enter)</small>
        </button>
      );
    case 'checking':
      return (
        <button
          type="button"
          className="btn btn-success"
          data-guide-id="CheckResultButton"
          onClick={onClick}
          disabled
        >
          <FontAwesomeIcon icon="spinner" pulse />
          {` ${i18n.t('Check')}`}
          <small> (ctrl+enter)</small>
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-success"
          data-guide-id="CheckResultButton"
          disabled
        >
          <FontAwesomeIcon icon="play-circle" />
          {` ${i18n.t('Check')}`}
          <small> (ctrl+enter)</small>
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
          className="btn btn-outline-danger"
          onClick={onClick}
        >
          <span className="fa fa-times-circle mr-1" />
          {i18n.t('Give up')}
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-outline-danger"
          disabled
        >
          <span className="fa fa-times-circle mr-1" />
          {i18n.t('Give up')}
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
          className="btn btn-outline-secondary ml-auto mr-2"
          onClick={onClick}
        >
          <span className="fa fa-times-circle mr-1" />
          {i18n.t('Reset')}
        </button>
      );
    case 'disabled':
      return (
        <button
          type="button"
          className="btn btn-outline-secondary ml-auto mr-2"
          disabled
        >
          <span className="fa fa-times-circle mr-1" />
          {i18n.t('Reset')}
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
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(currentUserId)(state));

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
    <div className="d-flex" role="toolbar">
      <GiveUpButton onClick={modalShow} status={giveUpBtnStatus} />
      <ResetButton onClick={handleReset} status={resetBtnStatus} />
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      {renderModal()}
    </div>
  );
};

export default GameActionButtons;
