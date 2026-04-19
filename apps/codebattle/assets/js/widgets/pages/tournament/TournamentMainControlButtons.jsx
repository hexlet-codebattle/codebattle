import React, { memo, useCallback, useContext, useRef, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import Button from "react-bootstrap/Button";
import { useDispatch } from "react-redux";

import Modal from "@/components/BootstrapModal";
import CustomEventStylesContext from "@/components/CustomEventStylesContext";

import {
  cancelTournament,
  finishTournament,
  restartTournament as handleRestartTournament,
  retryTournament as handleRetryTournament,
  finishRoundTournament as handleFinishRoundTournament,
  openUpTournament as handleOpenUpTournament,
  showTournamentResults as handleShowResults,
} from "../../middlewares/TournamentAdmin";

function TournamentMainControlButtons({
  accessType,
  streamMode,
  tournamentId,
  canStart,
  canStartRound,
  canFinishRound,
  canFinishTournament,
  canToggleShowBots,
  canRestart,
  showBots,
  hideResults,
  disabled = true,
  toggleShowBots,
  handleStartRound,
  handleOpenDetails,
  toggleStreamMode,
}) {
  const dispatch = useDispatch();
  const confirmBtnRef = useRef(null);
  const hasCustomEventStyle = useContext(CustomEventStylesContext);
  const [restartConfirmationModalShowing, setRestartConfirmationModalShowing] = useState(false);
  const [retryConfirmationModalShowing, setRetryConfirmationModalShowing] = useState(false);
  const [finishConfirmationModalShowing, setFinishConfirmationModalShowing] = useState(false);

  const handleStartTournament = useCallback(() => {
    handleStartRound("firstRound");
  }, [handleStartRound]);
  const handleCancelTournament = useCallback(() => {
    dispatch(cancelTournament());
  }, [dispatch]);
  const handleStartRoundTournament = useCallback(() => {
    handleStartRound("nextRound");
  }, [handleStartRound]);
  const openRestartConfirmationModal = useCallback(() => {
    setRestartConfirmationModalShowing(true);
  }, []);
  const closeRestartConfirmationModal = useCallback(() => {
    setRestartConfirmationModalShowing(false);
  }, []);
  const confirmRestartTournament = useCallback(() => {
    handleRestartTournament();
    closeRestartConfirmationModal();
  }, [closeRestartConfirmationModal]);
  const openRetryConfirmationModal = useCallback(() => {
    setRetryConfirmationModalShowing(true);
  }, []);
  const closeRetryConfirmationModal = useCallback(() => {
    setRetryConfirmationModalShowing(false);
  }, []);
  const confirmRetryTournament = useCallback(() => {
    handleRetryTournament();
    closeRetryConfirmationModal();
  }, [closeRetryConfirmationModal]);
  const openFinishConfirmationModal = useCallback(() => {
    setFinishConfirmationModalShowing(true);
  }, []);
  const closeFinishConfirmationModal = useCallback(() => {
    setFinishConfirmationModalShowing(false);
  }, []);
  const confirmFinishTournament = useCallback(() => {
    finishTournament();
    closeFinishConfirmationModal();
  }, [closeFinishConfirmationModal]);

  const cancelBtnClassName = cn("btn cb-rounded", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  const confirmBtnClassName = cn("btn text-white cb-rounded", {
    "btn-danger": !hasCustomEventStyle,
    "cb-custom-event-btn-danger": hasCustomEventStyle,
  });
  const actionBtnClassName = cn("btn btn-sm text-nowrap cb-rounded mr-2 mb-2", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  const flowBtnClassName = cn("btn btn-sm text-nowrap cb-rounded mr-2 mb-2 text-white", {
    "btn-success cb-btn-success": !hasCustomEventStyle,
    "cb-custom-event-btn-success": hasCustomEventStyle,
  });
  const subtleBtnClassName = cn("btn btn-sm text-nowrap cb-rounded mr-2 mb-2", {
    "btn-outline-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  const destructiveBtnClassName = cn("btn btn-sm text-nowrap cb-rounded mr-2 mb-2 text-white", {
    "btn-danger": !hasCustomEventStyle,
    "cb-custom-event-btn-danger": hasCustomEventStyle,
  });
  const settingsColClassName = cn("px-2 mb-3 mb-xl-0", {
    "col-12": streamMode,
    "col-12 col-xl-6": !streamMode,
  });

  return (
    <>
      <Modal
        show={restartConfirmationModalShowing}
        onHide={closeRestartConfirmationModal}
        contentClassName="cb-bg-panel cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>Reset tournament progress</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <div className="d-flex flex-column">
            <h4 className="mb-3">Are you sure you want to reset this tournament?</h4>
            <p className="mb-0 text-muted">
              This action is destructive. All tournament progress, matches, and results will be
              lost.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <div className="d-flex justify-content-between w-100">
            <Button onClick={closeRestartConfirmationModal} className={cancelBtnClassName}>
              Cancel
            </Button>
            <Button
              ref={confirmBtnRef}
              onClick={confirmRestartTournament}
              className={confirmBtnClassName}
            >
              Reset tournament
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      <Modal
        show={retryConfirmationModalShowing}
        onHide={closeRetryConfirmationModal}
        contentClassName="cb-bg-panel cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>Retry tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <div className="d-flex flex-column">
            <h4 className="mb-3">Are you sure you want to retry this tournament?</h4>
            <p className="mb-0 text-muted">
              This will clear tournament games and results, then restore the current player roster.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <div className="d-flex justify-content-between w-100">
            <Button onClick={closeRetryConfirmationModal} className={cancelBtnClassName}>
              Cancel
            </Button>
            <Button onClick={confirmRetryTournament} className={confirmBtnClassName}>
              Retry tournament
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      <Modal
        show={finishConfirmationModalShowing}
        onHide={closeFinishConfirmationModal}
        contentClassName="cb-bg-panel cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>Finish tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <div className="d-flex flex-column">
            <h4 className="mb-3">Are you sure you want to finish this tournament?</h4>
            <p className="mb-0 text-muted">
              This will end the tournament and finalize all results.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <div className="d-flex justify-content-between w-100">
            <Button onClick={closeFinishConfirmationModal} className={cancelBtnClassName}>
              Cancel
            </Button>
            <Button onClick={confirmFinishTournament} className={confirmBtnClassName}>
              Finish tournament
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      <div className="d-flex flex-column w-100">
        <div className="row mx-n2">
          {!streamMode && (
            <div className="col-12 col-xl-6 px-2 mb-3 mb-xl-0">
              <div className="small text-uppercase text-muted font-weight-bold mb-2">
                Tournament flow
              </div>
              <div className="d-flex flex-wrap align-items-center">
                {canStartRound ? (
                  <button
                    type="button"
                    className={flowBtnClassName}
                    onClick={handleStartRoundTournament}
                    disabled={!canStartRound || disabled}
                  >
                    <FontAwesomeIcon className="mr-2" icon="arrow-right" />
                    Start Round
                  </button>
                ) : null}
                {canFinishRound ? (
                  <button
                    type="button"
                    className={flowBtnClassName}
                    onClick={handleFinishRoundTournament}
                    disabled={!canFinishRound || disabled}
                  >
                    <FontAwesomeIcon className="mr-2" icon="flag-checkered" />
                    Finish Round
                  </button>
                ) : null}
                {canFinishTournament ? (
                  <button
                    type="button"
                    className={actionBtnClassName}
                    onClick={openFinishConfirmationModal}
                    disabled={disabled}
                  >
                    <FontAwesomeIcon className="mr-2" icon="stop" />
                    Finish Tournament
                  </button>
                ) : null}
                {canRestart ? (
                  <button
                    type="button"
                    className={actionBtnClassName}
                    onClick={openRestartConfirmationModal}
                    disabled={!canRestart || disabled}
                  >
                    <FontAwesomeIcon className="mr-2" icon="sync" />
                    Restart
                  </button>
                ) : (
                  <button
                    type="button"
                    className={flowBtnClassName}
                    onClick={handleStartTournament}
                    disabled={!canStart || disabled}
                  >
                    <FontAwesomeIcon className="mr-2" icon="play" />
                    Start
                  </button>
                )}
                <button
                  type="button"
                  className={actionBtnClassName}
                  onClick={openRetryConfirmationModal}
                  disabled={disabled}
                >
                  <FontAwesomeIcon className="mr-2" icon="redo" />
                  Retry
                </button>
                <button
                  type="button"
                  className={actionBtnClassName}
                  onClick={handleShowResults}
                  disabled={disabled || !hideResults}
                >
                  <FontAwesomeIcon className="mr-2" icon="eye" />
                  Show Results
                </button>
                <button
                  type="button"
                  className={destructiveBtnClassName}
                  onClick={handleCancelTournament}
                  disabled={disabled}
                >
                  <FontAwesomeIcon className="mr-2" icon="trash" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className={settingsColClassName}>
            <div className="small text-uppercase text-muted font-weight-bold mb-2">Settings</div>
            <div className="d-flex flex-wrap align-items-center">
              <a href={`/tournaments/${tournamentId}/edit`} className={subtleBtnClassName}>
                <FontAwesomeIcon className="mr-2" icon="edit" />
                Edit
              </a>
              <button type="button" className={subtleBtnClassName} onClick={handleOpenDetails}>
                <FontAwesomeIcon className="mr-2" icon="cog" />
                Tournament details
              </button>
              <button
                type="button"
                className={subtleBtnClassName}
                onClick={toggleStreamMode}
                disabled={disabled}
              >
                <FontAwesomeIcon className="mr-2" icon="video" />
                Toggle stream mode
              </button>
              <button
                type="button"
                className={subtleBtnClassName}
                onClick={toggleShowBots}
                disabled={disabled || !canToggleShowBots}
              >
                <FontAwesomeIcon className="mr-2" icon="robot" />
                {showBots ? "Hide bots" : "Show bots"}
              </button>
              {accessType === "token" && (
                <button
                  type="button"
                  className={subtleBtnClassName}
                  onClick={handleOpenUpTournament}
                  disabled={disabled}
                >
                  <FontAwesomeIcon className="mr-2" icon="unlock" />
                  Open up
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(TournamentMainControlButtons);
