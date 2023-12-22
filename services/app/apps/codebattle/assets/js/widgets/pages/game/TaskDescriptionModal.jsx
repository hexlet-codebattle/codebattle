import React, {
  useCallback, memo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import {
  gameTaskSelector, taskDescriptionLanguageselector,
} from '@/selectors';

import { actions } from '../../slices';

import TaskAssignment from './TaskAssignment';

function TaskDescriptionModal({ modalShowing, setModalShowing }) {
  const dispatch = useDispatch();

  const task = useSelector(gameTaskSelector);
  const taskLanguage = useSelector(taskDescriptionLanguageselector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  const handleClose = useCallback(() => {
    setModalShowing(false);
  }, [setModalShowing]);

  return (
    <Modal centered show={modalShowing} onHide={handleClose}>
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
            onClick={handleClose}
            className="btn btn-secondary text-white rounded-lg"
          >
            <FontAwesomeIcon icon="times" className="mr-2" />
            Close
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(TaskDescriptionModal);
