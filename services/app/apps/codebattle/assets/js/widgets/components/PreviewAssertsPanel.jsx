import React, {
  useCallback,
  useContext,
  memo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SignatureTrack from './SignatureTrack';
import ExamplesTrack from './ExamplesTrack';
import RoomContext from '../containers/RoomContext';
import * as selectors from '../selectors';

import {
  itemActionClassName,
  itemClassName,
  itemAddClassName,
  MAX_INPUT_ARGUMENTS_COUNT,
  MIN_EXAMPLES_COUNT,
} from '../utils/builder';
import { buildTaskAsserts, deleteTask } from '../middlewares/Game';
import {
  isIdleStateTaskSelector,
  isInvalidStateTaskSelector,
  isSavedStateTaskSelector,
  isTaskPrepareSavingSelector,
  isTaskPrepareTestingSelector,
  taskStateSelector,
} from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import { taskStateCodes } from '../config/task';

const PreviewAssertsPanel = memo(({
  haveInputSuggest,
  haveExampleSuggest,

  clearSuggests,

  openInputEditPanel,
  openExampleEditPanel,

  createInputTypeSuggest,
  editInputType,
  deleteInputType,
  editOutputType,

  createExampleSuggest,
  editExample,
  deleteExample,
}) => {
  const dispatch = useDispatch();

  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);
  const isIdleTaskState = isIdleStateTaskSelector(taskCurrent);
  const isSavedTask = isSavedStateTaskSelector(taskCurrent);
  const isInvalidTaskState = isInvalidStateTaskSelector(taskCurrent);

  const isSavingPrepare = isTaskPrepareSavingSelector(taskCurrent);
  const isTestingPrepare = isTaskPrepareTestingSelector(taskCurrent);

  const taskId = useSelector(state => state.builder.task.id);
  const taskState = useSelector(state => state.builder.task.state);
  const inputSignature = useSelector(state => state.builder.task.inputSignature);
  const outputSignature = useSelector(state => state.builder.task.outputSignature);
  const examples = useSelector(state => state.builder.task.assertsExamples);

  const validInputSignature = useSelector(state => state.builder.validationStatuses.inputSignature[0]);
  const validExamples = useSelector(state => state.builder.validationStatuses.assertsExamples[0]);

  const editable = useSelector(selectors.canEditTask);
  const readyTesting = validExamples;
  const readySave = useSelector(selectors.isValidTask);

  const disabledTestingBtn = !readyTesting || isInvalidTaskState || isTestingPrepare;
  const disabledSaveBtn = !readySave || isInvalidTaskState || isSavingPrepare || isSavedTask;

  const handleOpenTesting = useCallback(() => {
    taskService.send('START_TESTING');
    if (isIdleTaskState) {
      dispatch(buildTaskAsserts(taskService));
    }
  }, [taskService, isIdleTaskState, dispatch]);
  const handleSaveTask = useCallback(() => {
    clearSuggests();

    taskService.send('START_SAVING');
    if (isIdleTaskState) {
      dispatch(buildTaskAsserts(taskService));
    } else {
      taskService.send('SUCCESS');
    }
  }, [taskService, isIdleTaskState, clearSuggests, dispatch]);
  const handleRemoveTask = useCallback(() => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteTask(taskId));
    }
  }, [taskId, dispatch]);

  return (
    <div className="d-flex justify-content-between">
      <div className="overflow-auto">
        <h6 className="pl-1">{`Input parameters types (Max ${MAX_INPUT_ARGUMENTS_COUNT}):`}</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            <SignatureTrack
              editable={editable}
              items={inputSignature}
              valid={validInputSignature}
              handleEdit={editInputType}
              handleDelete={deleteInputType}
            />
          </div>
          {editable && inputSignature.length !== MAX_INPUT_ARGUMENTS_COUNT && (
            <div className="d-flex mb-2">
              <button
                type="button"
                title="Add input parameter"
                className={cn(itemAddClassName, {
                  'ml-1': inputSignature.length === 0,
                })}
                onClick={
                  haveInputSuggest ? openInputEditPanel : createInputTypeSuggest
                }
              >
                <FontAwesomeIcon icon={haveInputSuggest ? 'edit' : 'plus'} />
              </button>
            </div>
          )}
        </div>
        <h6 className="pl-1">Output parameter type:</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            {!!outputSignature && (
              <div className={itemClassName} role="group">
                <div
                  title={`(${outputSignature.type.name})`}
                  className={itemActionClassName}
                >
                  {`(${outputSignature.type.name})`}
                </div>
                {editable && (
                  <button
                    type="button"
                    title="Edit output parameter"
                    className={`btn ${itemActionClassName} btn-outline-secondary rounded-right`}
                    onClick={() => editOutputType({ ...outputSignature })}
                  >
                    <FontAwesomeIcon icon="pen" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <h6 className="pl-1">{`Examples (Min ${MIN_EXAMPLES_COUNT}):`}</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            <ExamplesTrack
              items={examples}
              editable={editable}
              valid={validExamples}
              handleEdit={editExample}
              handleDelete={deleteExample}
            />
          </div>
          {editable && (
            <div className="d-flex mb-2">
              <button
                type="button"
                title="Add example"
                className={cn(itemAddClassName, {
                  'ml-1': examples.length === 0,
                })}
                onClick={
                  haveExampleSuggest ? openExampleEditPanel : createExampleSuggest
                }
                disabled={inputSignature.length === 0}
              >
                <FontAwesomeIcon icon={haveExampleSuggest ? 'edit' : 'plus'} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="d-flex flex-column pl-1">
        <button
          type="button"
          className="btn btn-md btn-secondary rounded-lg mb-2"
          onClick={handleOpenTesting}
          disabled={disabledTestingBtn}
        >
          {isTestingPrepare && <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />}
          <span>Testing</span>
        </button>
        <button
          type="button"
          className="btn btn-md btn-success text-white rounded-lg mb-2"
          onClick={handleSaveTask}
          disabled={disabledSaveBtn}
        >
          {isSavingPrepare && <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />}
          <span>{isSavedTask ? 'Saved' : 'Save'}</span>
        </button>
        {taskState !== taskStateCodes.blank && (
          <button
            type="button"
            className="btn btn-md btn-danger rounded-lg mb-2"
            onClick={handleRemoveTask}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
});

export default PreviewAssertsPanel;
