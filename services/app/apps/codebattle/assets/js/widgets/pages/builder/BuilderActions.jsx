import React, { useCallback, useContext } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import ModalCodes from '../../config/modalCodes';
import { taskStateCodes } from '../../config/task';
import {
  isIdleStateTaskSelector,
  isInvalidTaskSelector,
  isSavedTaskSelector,
  isTaskPrepareSavingSelector,
  isTaskPrepareTestingSelector,
  taskStateSelector,
} from '../../machines/selectors';
import {
  buildTaskAsserts,
  deleteTask,
  publishTask,
  updateTaskState,
} from '../../middlewares/Room';
import * as selectors from '../../selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import { modalModes, modalActions } from './TaskParamsModal';

function ModerationActions({
  canPublish,
  canUnpublish,
  handlePublishTask,
  handleUnpublishTask,
}) {
  return (
    <>
      <button
        type="button"
        className="btn btn-md btn-outline-danger text-nowrap rounded-top"
        disabled
      >
        On moderation
      </button>
      {canUnpublish && (
        <button
          title="Cancel moderation"
          type="button"
          className="btn btn-md btn-primary text-nowrap rounded-bottom mb-2"
          onClick={handleUnpublishTask}
        >
          <FontAwesomeIcon className="mr-2" icon="share" />
          Cancel
        </button>
      )}
      {canPublish && (
        <button
          type="button"
          className="btn btn-md btn-primary text-nowrap rounded-bottom mb-2"
          onClick={handlePublishTask}
        >
          <FontAwesomeIcon className="mr-2" icon="share" />
          Publish
        </button>
      )}
    </>
  );
}

function BuilderActions({
  validExamples,
  clearSuggests,
}) {
  const dispatch = useDispatch();

  const { taskService } = useContext(RoomContext);

  const taskMachineState = useMachineStateSelector(taskService, taskStateSelector);
  const isIdleTaskState = isIdleStateTaskSelector(taskMachineState);
  const isSavedTask = isSavedTaskSelector(taskMachineState);
  const isInvalidTaskMachineState = isInvalidTaskSelector(taskMachineState);

  const isSavingPrepare = isTaskPrepareSavingSelector(taskMachineState);
  const isTestingPrepare = isTaskPrepareTestingSelector(taskMachineState);

  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isOwner = useSelector(selectors.isTaskOwner);

  const task = useSelector(
    state => state.builder.task,
  );

  const notPublished = task.state === taskStateCodes.draft
    && task.state === taskStateCodes.moderation;
  const readyTesting = validExamples;
  const readySave = useSelector(selectors.isValidTask);

  const disabledTestingBtn = (
    task.state === taskStateCodes.active
      ? false
      : !readyTesting || isInvalidTaskMachineState || isTestingPrepare
  );
  const disabledSaveBtn = !readySave || isInvalidTaskMachineState || isSavingPrepare || isSavedTask;

  const buildAsserts = useCallback(
    () => dispatch(buildTaskAsserts(taskService)),
    [taskService, dispatch],
  );
  const finishPreparing = useCallback(
    () => taskService.send('SUCCESS'),
    [taskService],
  );
  const prepareAsserts = isIdleTaskState ? buildAsserts : finishPreparing;

  const handleOpenTesting = useCallback(() => {
    clearSuggests();

    taskService.send('START_TESTING');
    prepareAsserts();
  }, [taskService, prepareAsserts, clearSuggests]);

  const handleSaveTask = useCallback(() => {
    clearSuggests();

    taskService.send('START_SAVING');
    prepareAsserts();
  }, [taskService, prepareAsserts, clearSuggests]);

  const handleDeleteTask = useCallback(() => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteTask(task.id));
    }
  }, [task.id, dispatch]);
  const handlePublishTask = useCallback(() => {
    dispatch(publishTask(task.id));
  }, [task.id, dispatch]);
  const handleUnpublishTask = useCallback(() => {
    dispatch(updateTaskState(task.id, taskStateCodes.draft));
  }, [task.id, dispatch]);
  const handleActivateTask = useCallback(() => {
    dispatch(updateTaskState(task.id, taskStateCodes.active));
  }, [task.id, dispatch]);
  const handleDisableTask = useCallback(() => {
    dispatch(updateTaskState(task.id, taskStateCodes.disabled));
  }, [task.id, dispatch]);

  const openUploadTaskModal = useCallback(() => {
    NiceModal.show(ModalCodes.taskParamsModal, { mode: modalModes.editJSON, action: modalActions.upload });
  }, []);
  const openCopyTaskModal = useCallback(() => {
    NiceModal.show(ModalCodes.taskParamsModal, { mode: modalModes.showJSON, action: modalActions.copy });
  }, []);

  if (!(isAdmin || isOwner)) {
    return null;
  }

  return (
    <>
      {task.state === taskStateCodes.blank && (
        <button
          type="button"
          className="btn btn-md btn-secondary text-nowrap rounded-lg mb-2"
          onClick={openUploadTaskModal}
        >
          <FontAwesomeIcon className="mr-2" icon="upload" />
          Upload
        </button>
      )}
      {task.state !== taskStateCodes.blank && (
        <button
          type="button"
          className="btn btn-md btn-secondary text-nowrap rounded-lg mb-2"
          onClick={openCopyTaskModal}
        >
          <FontAwesomeIcon className="mr-2" icon="copy" />
          Copy
        </button>
      )}
      <button
        type="button"
        className="btn btn-md btn-secondary text-nowrap rounded-lg mb-2"
        onClick={handleOpenTesting}
        disabled={disabledTestingBtn}
      >
        {isTestingPrepare ? (
          <span
            className="spinner-border spinner-border-sm mr-2"
            role="status"
            aria-hidden="true"
          />
        ) : (
          <FontAwesomeIcon className="mr-2" icon="play" />
        )}
        <span>Testing</span>
      </button>
      <button
        type="button"
        className="btn btn-md btn-success text-nowrap text-white rounded-lg mb-2"
        onClick={handleSaveTask}
        disabled={disabledSaveBtn}
      >
        {isSavingPrepare ? (
          <span
            className="spinner-border spinner-border-sm mr-2"
            role="status"
            aria-hidden="true"
          />
        ) : (
          <FontAwesomeIcon className="mr-2" icon="save" />
        )}
        <span>{isSavedTask ? 'Saved' : 'Save'}</span>
      </button>
      {notPublished && (
        <button
          type="button"
          className="btn btn-md btn-danger text-nowrap rounded-lg mb-2"
          onClick={handleDeleteTask}
        >
          <FontAwesomeIcon className="mr-2" icon="trash" />
          Delete
        </button>
      )}
      {task.state === taskStateCodes.draft && (
        <button
          type="button"
          className="btn btn-md btn-primary text-nowrap rounded-lg mb-2"
          onClick={handlePublishTask}
        >
          <FontAwesomeIcon className="mr-2" icon="paper-plane" />
          Publish
        </button>
      )}
      {task.state === taskStateCodes.moderation && (
        <ModerationActions
          canPublish={isAdmin}
          canUnpublish={isOwner || isAdmin}
          handlePublishTask={handlePublishTask}
          handleUnpublishTask={handleUnpublishTask}
        />
      )}
      {task.state === taskStateCodes.active && (
        <button
          type="button"
          className="btn btn-md btn-danger text-nowrap rounded-lg mb-2"
          onClick={handleDisableTask}
        >
          <FontAwesomeIcon className="mr-2" icon="times-circle" />
          Disable
        </button>
      )}
      {task.state === taskStateCodes.disabled && (
        <button
          type="button"
          className="btn btn-md btn-primary text-nowrap rounded-lg mb-2"
          onClick={handleActivateTask}
        >
          <FontAwesomeIcon className="mr-2" icon="check-circle" />
          Activate
        </button>
      )}
    </>
  );
}

export default BuilderActions;
