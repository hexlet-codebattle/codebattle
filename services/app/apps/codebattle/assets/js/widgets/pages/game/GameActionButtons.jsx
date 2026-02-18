import React, { useContext, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dropdown } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { useDispatch } from "react-redux";

import Modal from "@/components/BootstrapModal";

import i18next from "../../../i18n";
import RoomContext from "../../components/RoomContext";
import { inTestingRoomSelector } from "../../machines/selectors";
import {
  sendGiveUp,
  resetTextToTemplateAndSend,
  resetTextToTemplate,
} from "../../middlewares/Room";
import { actions } from "../../slices";
import useMachineStateSelector from "../../utils/useMachineStateSelector";

function CheckResultButton({ onClick, status }) {
  const dispatch = useDispatch();
  const commonProps = {
    type: "button",
    className: "btn btn-sm btn-outline-success cb-btn-outline-success btn-check cb-rounded",
    title: `${i18next.t("Check solution")}&#013;Ctrl + Enter`,
    "data-toggle": "tooltip",
    "data-guide-id": "CheckResultButton",
    "data-placement": "top",
  };

  const commonEnabledProps = {
    ...commonProps,
    onClick,
  };

  switch (status) {
    case "enabled":
      return (
        <button type="button" {...commonEnabledProps}>
          <FontAwesomeIcon icon={["fas", "play-circle"]} className="mr-2 success" />
          {i18next.t("Run")}
        </button>
      );
    case "charging":
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon className="mr-2" icon="spinner" pulse />
          {i18next.t("Charging...")}
        </button>
      );
    case "checking":
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon className="mr-2" icon="spinner" pulse />
          {i18next.t("Running...")}
        </button>
      );
    case "disabled":
      return (
        <button type="button" {...commonProps} disabled>
          <FontAwesomeIcon icon={["fas", "play-circle"]} className="mr-2 success" />
          {i18next.t("Run")}
        </button>
      );
    default: {
      dispatch(actions.setError(new Error("unnexpected check status")));
      return null;
    }
  }
}

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

function GiveUpButtonDropdownItem({ onSelect, status }) {
  const commonProps = {
    as: "a",
    href: "#",
    title: i18next.t("Give Up"),
    onSelect,
    disabled: status === "disabled",
    className: "cb-dropdown-item",
  };

  return (
    <Dropdown.Item key="giveUp" {...commonProps}>
      <span className={status === "disabled" ? "text-muted" : "text-danger"}>
        <FontAwesomeIcon icon={["far", "flag"]} className="mr-1" />
        {i18next.t("Give up")}
      </span>
    </Dropdown.Item>
  );
}

function ResetButtonDropDownItem({ onSelect, status }) {
  const commonProps = {
    as: "a",
    href: "#",
    title: i18next.t("Reset solution"),
    onSelect,
    disabled: status === "disabled",
    className: "cb-dropdown-item",
  };

  return (
    <Dropdown.Item key="reset" {...commonProps}>
      <span className="text-white">
        <FontAwesomeIcon icon={["fas", "sync"]} className="mr-1" />
        {i18next.t("Reset solution")}
      </span>
    </Dropdown.Item>
  );
}

function GameActionButtons({
  currentEditorLangSlug,
  checkResult,
  checkBtnStatus,
  resetBtnStatus,
  giveUpBtnStatus,
  showGiveUpBtn,
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
    <Modal show={modalShowing} onHide={modalHide} contentClassName="cb-bg-panel cb-text">
      <Modal.Body className="text-center cb-bg-panel">
        {i18next.t("Are you sure you want to give up?")}
      </Modal.Body>
      <Modal.Footer className="mx-auto border-0">
        <Button onClick={handleGiveUp} className="btn-danger cb-rounded">
          {i18next.t("Give up")}
        </Button>
        <Button onClick={modalHide} className="btn-secondary cb-btn-secondary cb-rounded">
          {i18next.t("Cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="d-flex py-2" role="group" aria-label="Game actions">
      <CheckResultButton onClick={checkResult} status={checkBtnStatus} />
      <Dropdown title="Other actions">
        <Dropdown.Toggle
          as={CustomToggle}
          className="btn btm-sm btn-secondary cb-btn-secondary cb-rounded mx-1"
          split
          id="dropdown-actions"
        >
          <FontAwesomeIcon icon="ellipsis-v" className="mr-1" />
        </Dropdown.Toggle>

        <Dropdown.Menu className="h-auto cb-overflow-x-hidden cb-scrollable-menu-dropdown-chat cb-blur">
          <ResetButtonDropDownItem onSelect={handleReset} status={resetBtnStatus} />
          {showGiveUpBtn && (
            <GiveUpButtonDropdownItem onSelect={modalShow} status={giveUpBtnStatus} />
          )}
        </Dropdown.Menu>
      </Dropdown>
      {renderModal()}
    </div>
  );
}

export default GameActionButtons;
