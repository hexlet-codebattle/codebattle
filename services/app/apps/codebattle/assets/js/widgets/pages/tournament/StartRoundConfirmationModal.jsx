import React, { useCallback, useRef, memo, useContext } from "react";

import cn from "classnames";
import Button from "react-bootstrap/Button";

import Modal from "@/components/BootstrapModal";
import CustomEventStylesContext from "@/components/CustomEventStylesContext";

import {
  startTournament as handleStartTournament,
  startRoundTournament as handleStartRoundTournament,
} from "../../middlewares/TournamentAdmin";

const getModalTittle = (type) => {
  switch (type) {
    case "firstRound":
      return "Start tournament confirmation";
    case "nextRound":
      return "Start next round";
    default:
      return "";
  }
};

const getModalText = (type) => {
  switch (type) {
    case "firstRound":
      return "Are you sure you want to start the tournament?";
    case "nextRound":
      return "Are you sure you want to start the round?";
    default:
      return "";
  }
};

function StartRoundConfirmationModal({
  matchTimeoutSeconds,
  level,
  taskPackName,
  taskProvider,
  modalShowing,
  onClose,
}) {
  const confirmBtnRef = useRef(null);

  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const cancelBtnClassName = cn("btn cb-rounded", {
    "btn-secondary cb-btn-secondary": !hasCustomEventStyle,
    "cb-custom-event-btn-secondary": hasCustomEventStyle,
  });
  const confirmBtnClassName = cn("btn text-white cb-rounded", {
    "btn-success cb-btn-success": !hasCustomEventStyle,
    "cb-custom-event-btn-success": hasCustomEventStyle,
  });

  const handleConfirmation = useCallback(() => {
    switch (modalShowing) {
      case "firstRound": {
        handleStartTournament();
        break;
      }
      case "nextRound": {
        handleStartRoundTournament();
        break;
      }
      default: {
        break;
      }
    }

    onClose();
  }, [modalShowing, onClose]);

  const title = getModalTittle(modalShowing);
  const text = getModalText(modalShowing);

  return (
    <Modal show={!!modalShowing} onHide={onClose} contentClassName="cb-bg-panel cb-text">
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="cb-border-color">
        <div className="d-flex flex-column justify-content-between align-items-center">
          <h4 className="mb-4">{text}</h4>
          <div className="d-flex flex-column justify-content-center">
            <div className="d-flex justify-content-center">
              <span title="Round timeout seconds" className="mr-2">
                {"Seconds: "}
                {matchTimeoutSeconds}
                {", "}
              </span>
              {taskProvider === "task_pack" && (
                <span title="Round task pack id">
                  {"Task pack name: "}
                  {taskPackName}
                </span>
              )}
              {taskProvider === "level" && (
                <span title="Round task level">
                  {"Task level: "}
                  {level}
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-between w-100">
          <Button onClick={onClose} className={cancelBtnClassName}>
            Cancel
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className={confirmBtnClassName}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(StartRoundConfirmationModal);
