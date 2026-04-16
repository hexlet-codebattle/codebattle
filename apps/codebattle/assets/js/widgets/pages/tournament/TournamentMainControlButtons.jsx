import React, { memo, useCallback, useContext, useRef, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
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

const CustomToggle = React.forwardRef(({ onClick, className, disabled }, ref) => (
  <button
    type="button"
    ref={ref}
    className={className.replace("dropdown-toggle", "")}
    onClick={onClick}
    disabled={disabled}
  >
    <FontAwesomeIcon icon="ellipsis-v" />
  </button>
));

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

  const restartBtnClassName = cn(
    "btn text-nowrap ml-lg-2 rounded-left btn-secondary cb-btn-secondary",
  );
  const roundBtnClassName = cn(
    "btn text-nowrap ml-lg-2 rounded-left btn-success cb-btn-success text-white",
  );
  const cancelBtnClassName = cn("btn cb-rounded", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  const confirmBtnClassName = cn("btn text-white cb-rounded", {
    "btn-danger": !hasCustomEventStyle,
    "cb-custom-event-btn-danger": hasCustomEventStyle,
  });

  const dropdownBtnClassName = cn("btn text-white rounded-right", {
    "rounded-left": streamMode,
    "btn-secondary cb-btn-secondary": canRestart,
    "btn-success cb-btn-success text-white": !canRestart,
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
      {!streamMode && (
        <>
          {canStartRound ? (
            <button
              type="button"
              className={roundBtnClassName}
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
              className={roundBtnClassName}
              onClick={handleFinishRoundTournament}
              disabled={!canFinishRound || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="arrow-right" />
              Finish Round
            </button>
          ) : null}
          {canFinishTournament ? (
            <button
              type="button"
              className={restartBtnClassName}
              onClick={openFinishConfirmationModal}
              disabled={disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="flag-checkered" />
              Finish
            </button>
          ) : null}
          {canRestart ? (
            <button
              type="button"
              className={restartBtnClassName}
              onClick={openRestartConfirmationModal}
              disabled={!canRestart || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="sync" />
              Restart
            </button>
          ) : (
            <button
              type="button"
              className={roundBtnClassName}
              onClick={handleStartTournament}
              disabled={!canStart || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="play" />
              Start
            </button>
          )}
        </>
      )}
      <Dropdown title="Task actions" className="d-flex cb-dropdown">
        <Dropdown.Toggle
          as={CustomToggle}
          id="tournament-actions-dropdown-toggle"
          className={dropdownBtnClassName}
          variant={canRestart ? "info" : "success"}
          disabled={disabled}
        />
        <Dropdown.Menu className="cb-dropdown-menu cb-bg-highlight-panel dropdown-menu-end">
          <Dropdown.Item
            as="a"
            disabled={disabled}
            key="edit"
            href={`/tournaments/${tournamentId}/edit`}
            className="cb-dropdown-item"
          >
            <FontAwesomeIcon className="mr-2" icon="edit" />
            Edit
          </Dropdown.Item>
          <Dropdown.Item as="a" key="tournaments" href="/tournaments" className="cb-dropdown-item">
            <FontAwesomeIcon className="mr-2" icon="trophy" />
            Tournaments
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled || !hideResults}
            key="showResults"
            onSelect={handleShowResults}
            className="cb-dropdown-item"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Show Results
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled}
            key="streamMode"
            className="cb-dropdown-item"
            onSelect={toggleStreamMode}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Toggle stream mode
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled || !canToggleShowBots}
            key="showBots"
            className="cb-dropdown-item"
            onSelect={toggleShowBots}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {showBots ? "Hide bots" : "Show bots"}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            key="tournamentDetails"
            className="cb-dropdown-item"
            onSelect={handleOpenDetails}
          >
            <FontAwesomeIcon className="mr-2" icon="cog" />
            Tournament details
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled}
            key="retry"
            className="cb-dropdown-item"
            onSelect={openRetryConfirmationModal}
          >
            <FontAwesomeIcon className="mr-2" icon="redo" />
            Retry
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled}
            key="cancel"
            className="cb-dropdown-item"
            onSelect={handleCancelTournament}
          >
            <FontAwesomeIcon className="mr-2" icon="trash" />
            Cancel
          </Dropdown.Item>
          {accessType === "token" && (
            <>
              <Dropdown.Divider className="cb-border-color" />
              <Dropdown.Item
                as="button"
                disabled={disabled}
                key="openUp"
                className="cb-dropdown-item"
                onSelect={handleOpenUpTournament}
              >
                <FontAwesomeIcon className="mr-2" icon="unlock" />
                Open up
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
}

export default memo(TournamentMainControlButtons);
