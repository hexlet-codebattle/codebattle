import React, { useContext, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Editor from '../containers/Editor';
import RoomContext from '../containers/RoomContext';
import {
  getGeneratorStatus,
  validationStatuses,
} from '../machines/task';
import { taskTemplatesStates } from '../utils/builder';
import TaskPropStatusIcon from '../containers/TaskPropStatusIcon';
import { fetchGeneratorAndSolutionTemplates } from '../middlewares/Game';
import * as selectors from '../selectors';
import { actions } from '../slices';
import { gameRoomEditorStyles } from '../config/editorSettings';
import { isTaskAssertsFormingSelector, isTaskAssertsReadySelector, taskStateSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

const InfoPopup = ({ reloadGeneratorCode }) => {
  const infoClassName = cn(
    'd-flex align-items-center justify-content-around position-absolute w-100 h-100 p-3',
    'bg-gray text-black  cb-opacity-75',
  );

  return (
    <div className={infoClassName}>
      <span className="text-center">
        Reload (Press
        {' '}
        {
          <button
            type="button"
            className="btn border-0 rounded-lg p-1"
            onClick={reloadGeneratorCode}
          >
            <FontAwesomeIcon icon="redo" />
          </button>
        }
        ) Generator/Solution code.
      </span>
    </div>
  );
};

const BuilderEditorsWidget = () => {
  const dispatch = useDispatch();
  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);
  const isAssertsReady = isTaskAssertsReadySelector(taskCurrent);
  const isAssertsForming = isTaskAssertsFormingSelector(taskCurrent);

  const templatesState = useSelector(selectors.taskTemplatesStateSelector);
  const editorsLang = useSelector(selectors.taskGeneratorLangSelector);
  const textArgumentsGenerator = useSelector(
    selectors.taskTextArgumentsGeneratorSelector,
  );
  const textSolution = useSelector(selectors.taskTextSolutionSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector(currentUserId));
  const editorsMode = useSelector(selectors.editorsModeSelector(currentUserId));

  const [isValidArgumentsGenerator] = useSelector(
    state => state.builder.validationStatuses.argumentsGenerator,
  );
  const [isValidSolution] = useSelector(
    state => state.builder.validationStatuses.solution,
  );

  const templateState = useSelector(state => state.builder.templates.state);

  const reloadCode = useCallback(() => {
    dispatch(fetchGeneratorAndSolutionTemplates(taskService));
  }, [taskService, dispatch]);

  // const resetCode = useCallback(() => {
  //   dispatch(actions.resetGeneratorAndSolutionText(taskService));
  // }, [taskService]);

  // const rejectAssertsGeneration = useCallback(() => {
  //   dispatch(actions.rejectGeneratorAndSolution());
  // }, [dispatch]);

  const disabledEditors = templatesState === taskTemplatesStates.none;
  const validationStarts = isAssertsForming;

  const params = {
    editable: !disabledEditors && !validationStarts,
    syntax: editorsLang,
    mode: editorsMode,
    theme,
    mute: true,
  };

  const onChangeGenerator = useCallback(value => {
    if (isAssertsReady) {
      taskService.send('CHANGES');
    }

    dispatch(actions.setTaskArgumentsGenerator({ value }));
  }, [dispatch, taskService, isAssertsReady]);
  const onChangeSolution = useCallback(value => {
    if (isAssertsReady) {
      taskService.send('CHANGES');
    }

    dispatch(actions.setTaskSolution({ value }));
  }, [dispatch, taskService, isAssertsReady]);

  const generatorParams = {
    ...params,
    value: textArgumentsGenerator,
    onChange: onChangeGenerator,
  };

  const solutionParams = {
    ...params,
    value: textSolution,
    onChange: onChangeSolution,
  };

  return (
    <>
      <div className="col-12 col-lg-6 p-1" data-editor-state="idle">
        <div
          className="card h-100 shadow-sm position-relative"
          style={gameRoomEditorStyles}
        >
          <div className="rounded-top" data-player-type="current_user">
            <div className="d-flex align-items-center p-1">
              <div className="py-2">
                <TaskPropStatusIcon
                  status={
                    !isValidArgumentsGenerator
                      ? validationStatuses.invalid
                      : getGeneratorStatus(templateState, taskCurrent)
                  }
                />
              </div>
              <h5 className="pt-2">Step 3: Generator</h5>
            </div>
          </div>
          <Editor {...generatorParams} />
          {disabledEditors && (
            <InfoPopup reloadGeneratorCode={reloadCode} />
          )}
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1" data-editor-state="idle">
        <div className="card h-100 shadow-sm" style={gameRoomEditorStyles}>
          <div className="rounded-top" data-player-type="current_user">
            <div className="d-flex align-items-center p-1">
              <div className="py-2">
                <TaskPropStatusIcon
                  status={
                    !isValidSolution
                      ? validationStatuses.invalid
                      : getGeneratorStatus(templateState, taskCurrent)
                  }
                />
              </div>
              <h5 className="pt-2">Step 4: Solution Example</h5>
            </div>
          </div>
          <Editor {...solutionParams} />
          {disabledEditors && (
            <InfoPopup reloadGeneratorCode={reloadCode} />
          )}
        </div>
      </div>
    </>
  );
};

export default BuilderEditorsWidget;
