import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import {
  gameTaskSelector, taskDescriptionLanguageSelector,
} from '@/selectors';

import ModalCodes from '../../config/modalCodes';
import { actions } from '../../slices';

import TaskAssignment from './TaskAssignment';

const TaskDescriptionModal = NiceModal.create(() => {
  const dispatch = useDispatch();

  const modal = useModal(ModalCodes.taskDescriptionModal);

  const task = useSelector(gameTaskSelector);
  const taskLanguage = useSelector(taskDescriptionLanguageSelector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>Task Description</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TaskAssignment
          task={task}
          taskLanguage={taskLanguage}
          handleSetLanguage={handleSetLanguage}
          hideGuide
          hideContribution
          fullSize
        />
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-end w-100">
          <Button
            onClick={modal.hide}
            className="btn btn-secondary text-white rounded-lg"
          >
            <FontAwesomeIcon icon="times" className="mr-2" />
            Close
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(TaskDescriptionModal);
