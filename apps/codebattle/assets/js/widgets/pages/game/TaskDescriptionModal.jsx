import React, { memo } from "react";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";

import Modal from "@/components/BootstrapModal";
import { gameTaskSelector, taskDescriptionLanguageSelector } from "@/selectors";

import i18n from "../../../i18n";
import ModalCodes from "../../config/modalCodes";
import { actions } from "../../slices";

import TaskAssignment from "./TaskAssignment";

const TaskDescriptionModal = NiceModal.create(() => {
  const dispatch = useDispatch();

  const modal = useModal(ModalCodes.taskDescriptionModal);

  const task = useSelector(gameTaskSelector);
  const taskLanguage = useSelector(taskDescriptionLanguageSelector);

  const handleSetLanguage = (lang) => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  return (
    <Modal contentClassName="cb-bg-panel cb-text" centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{i18n.t("Task Description")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="card cb-card border-0 cb-border-color">
        <TaskAssignment
          task={task}
          taskLanguage={taskLanguage}
          handleSetLanguage={handleSetLanguage}
          hideContribution
          fullSize
        />
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-end w-100">
          <Button onClick={modal.hide} className="btn btn-secondary cb-btn-secondary cb-rounded">
            <FontAwesomeIcon icon="times" className="mr-2" />
            {i18n.t("Close")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(TaskDescriptionModal);
