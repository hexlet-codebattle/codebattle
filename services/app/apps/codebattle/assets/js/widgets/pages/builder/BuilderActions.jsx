import React, { useCallback, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as selectors from '../../selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import {
  buildTaskAsserts,
  deleteTask,
  publishTask,
  updateTaskState,
} from '../../middlewares/Game';
import {
  isIdleStateTaskSelector,
  isInvalidStateTaskSelector,
  isSavedStateTaskSelector,
  isTaskPrepareSavingSelector,
  isTaskPrepareTestingSelector,
  taskStateSelector,
} from '../../machines/selectors';
import { taskStateCodes } from '../../config/task';
import RoomContext from '../../components/RoomContext';

function BuilderActions({ validExamples, clearSuggests }) {
  const dispatch = useDispatch();

  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);
  const isIdleTaskState = isIdleStateTaskSelector(taskCurrent);
  const isSavedTask = isSavedStateTaskSelector(taskCurrent);
  const isInvalidTaskMachineState = isInvalidStateTaskSelector(taskCurrent);

  const isSavingPrepare = isTaskPrepareSavingSelector(taskCurrent);
  const isTestingPrepare = isTaskPrepareTestingSelector(taskCurrent);

  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const isOwner = useSelector(selectors.isTaskOwner);

  const { id: taskId, state: taskState } = useSelector(
    state => state.builder.task,
  );

  const notPublished = taskState === taskStateCodes.draft
    && taskState === taskStateCodes.moderation;
  const readyTesting = validExamples;
  const readySave = useSelector(selectors.isValidTask);

  const disabledTestingBtn = !readyTesting || isInvalidTaskMachineState || isTestingPrepare;
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
      dispatch(deleteTask(taskId));
    }
  }, [taskId, dispatch]);
  const handlePublishTask = useCallback(() => {
    dispatch(publishTask(taskId));
  }, [taskId, dispatch]);
  const handleUnpublishTask = useCallback(() => {
    dispatch(updateTaskState(taskId, taskStateCodes.draft));
  }, [taskId, dispatch]);
  const handleActivateTask = useCallback(() => {
    dispatch(updateTaskState(taskId, taskStateCodes.active));
  }, [taskId, dispatch]);
  const handleDisableTask = useCallback(() => {
    dispatch(updateTaskState(taskId, taskStateCodes.disabled));
  }, [taskId, dispatch]);

  return (
    <>
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
      {taskState === taskStateCodes.draft && (
        <button
          type="button"
          className="btn btn-md btn-primary text-nowrap rounded-lg mb-2"
          onClick={handlePublishTask}
        >
          <FontAwesomeIcon className="mr-2" icon="paper-plane" />
          Publish
        </button>
      )}
      {taskState === taskStateCodes.moderation && (
        <>
          <button
            type="button"
            className="btn btn-md btn-outline-danger text-nowrap rounded-top"
            disabled
          >
            On moderation
          </button>
          {(isOwner || !isAdmin) && (
            <button
              title="Cancel moderation"
              type="button"
              className="btn btn-md btn-primary text-nowrap rounded-bottom mb-2"
              onClick={handleUnpublishTask}
              disabled={!isOwner}
            >
              <FontAwesomeIcon className="mr-2" icon="share" />
              Cancel
            </button>
          )}
          {isAdmin && (
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
      )}
      {taskState === taskStateCodes.active && (
        <button
          type="button"
          className="btn btn-md btn-danger text-nowrap rounded-lg mb-2"
          onClick={handleDisableTask}
        >
          <FontAwesomeIcon className="mr-2" icon="times-circle" />
          Disable
        </button>
      )}
      {taskState === taskStateCodes.disabled && (
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
