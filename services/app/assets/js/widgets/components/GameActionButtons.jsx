import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, sendGiveUp, resetTextToTemplate } from '../middlewares/Game';

const renderCheckResultButton = (checkResult, gameStatus, disabled, editorUser) => (
  <button
    type="button"
    className="btn btn-success"
    data-guide-id="CheckResultButton"
    onClick={checkResult}
    disabled={gameStatus.checking[editorUser] || disabled}
  >
    {
      (gameStatus.checking[editorUser])
        ? <FontAwesomeIcon icon="spinner" pulse />
        : <FontAwesomeIcon icon="play-circle" />
    }
    {` ${i18n.t('Check')}`}
    <small> (ctrl+enter)</small>
  </button>
);

const renderGiveUpButton = (modalShow, canGiveUp, disabled) => (
  <button
    type="button"
    className="btn btn-outline-danger"
    onClick={modalShow}
    disabled={!canGiveUp ? true : disabled}
  >
    <span className="fa fa-times-circle mr-1" />
    {i18n.t('Give up')}
  </button>
);

const renderResetButton = (handleReset, canReset, disabled) => (
  <button
    type="button"
    className="btn btn-outline-secondary ml-auto mr-2"
    disabled={!canReset ? true : disabled}
    onClick={handleReset}
  >
    <span className="fa fa-times-circle mr-1" />
    {i18n.t('Reset')}
  </button>
);

const GameActionButtons = ({ disabled, editorUser }) => {
  const [modalShowing, setModalShowing] = useState(false);
  const dispatch = useDispatch();
  const checkResult = () => dispatch(checkGameResult());

  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const currentEditorLangSlug = useSelector(state => selectors.userLangSelector(currentUserId)(state));
  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));

  const isSpectator = !_.hasIn(players, currentUserId);

  const { current } = useContext(GameContext);
  const canGiveUp = current.matches('active');
  const canReset = current.matches('active');
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
    <div className="d-flex" role="toolbar">
      {renderGiveUpButton(modalShow, canGiveUp, realDisabled)}
      {renderResetButton(handleReset, canReset, realDisabled)}
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
