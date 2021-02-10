import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, sendGiveUp, resetTextToTemplate } from '../middlewares/Game';

const renderCheckResultButton = (checkResult, gameStatus, disabled, editorUser) => (
  <button
    type="button"
    className="btn btn-outline-success btn-check btn-sm rounded"
    data-guide-id="CheckResultButton"
    onClick={checkResult}
    data-toggle="tooltip"
    data-placement="top"
    title="Check solution&#013;Ctrl + Enter"
    disabled={gameStatus.checking[editorUser] || disabled}
  >
    {
      (gameStatus.checking[editorUser])
        ? <FontAwesomeIcon icon="spinner" pulse />
        : <FontAwesomeIcon icon={['fas', 'play-circle']} className="success" />
    }
  </button>
);

const renderGiveUpButton = (modalShow, canGiveUp, disabled) => (
  <button
    type="button"
    className="btn btn-outline-danger btn-sm rounded mr-2"
    onClick={modalShow}
    data-toggle="tooltip"
    data-placement="top"
    title="Give Up"
    disabled={!canGiveUp ? true : disabled}
  >
    <FontAwesomeIcon icon={['far', 'flag']} />
  </button>
);

const renderResetButton = (handleReset, canReset, disabled) => (
  <button
    type="button"
    className="btn btn-outline-secondary btn-sm rounded mr-2"
    disabled={!canReset ? true : disabled}
    onClick={handleReset}
    data-toggle="tooltip"
    data-placement="top"
    title="Reset editor"
  >
    <FontAwesomeIcon icon={['fas', 'sync']} />
  </button>
);

const GameActionButtons = ({ disabled, editorUser, modifiers }) => {
  const [modalShowing, setModalShowing] = useState(false);
  const dispatch = useDispatch();
  const checkResult = () => dispatch(checkGameResult());

  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(currentUserId)(state));
  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));

  const isSpectator = !_.hasIn(players, currentUserId);
  const canGiveUp = gameStatus.status === GameStatusCodes.playing;
  const canReset = gameStatus.status === GameStatusCodes.playing;
  const realDisabled = isSpectator || disabled;

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
    <div className={`py-2 ${modifiers}`} role="toolbar">
      {renderResetButton(handleReset, canReset, realDisabled)}
      {renderGiveUpButton(modalShow, canGiveUp, realDisabled)}
      {renderCheckResultButton(
        checkResult,
        gameStatus,
        realDisabled,
        editorUser,
      )}
      {renderModal()}
    </div>
  );
};

export default GameActionButtons;
