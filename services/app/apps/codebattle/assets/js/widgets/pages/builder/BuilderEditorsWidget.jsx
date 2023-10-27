import React, {
  useState,
  useContext,
  useCallback,
  memo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import noop from 'lodash/noop';
import { useDispatch, useSelector } from 'react-redux';

import Editor from '../../components/Editor';
import LanguagePickerView from '../../components/LanguagePickerView';
import RoomContext from '../../components/RoomContext';
import { gameRoomEditorStyles } from '../../config/editorSettings';
import assertsStatuses from '../../config/executionStatuses';
import {
  isTaskAssertsFormingSelector,
  isTaskAssertsReadySelector,
  taskStateSelector,
} from '../../machines/selectors';
import {
  getGeneratorStatus,
  validationStatuses,
} from '../../machines/task';
import { reloadGeneratorAndSolutionTemplates } from '../../middlewares/Game';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { taskTemplatesStates } from '../../utils/builder';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import DakModeButton from '../game/DarkModeButton';
import VimModeButton from '../game/VimModeButton';

import AssertsOutput from './AssertsOutput';
import TaskPropStatusIcon from './TaskPropStatusIcon';

const isGeneratorsError = status => (
  status === assertsStatuses.error
    || status === assertsStatuses.memoryLeak
    || status === assertsStatuses.timeout
);

const InfoPopup = ({ reloadGeneratorCode, editable, origin }) => {
  const infoClassName = cn(
    'd-flex align-items-center justify-content-around position-absolute w-100 h-100 p-3',
    'bg-gray text-black  cb-opacity-75',
  );
  if (origin === 'github') {
    return (
      <div className={infoClassName}>
        <span className="text-center">Asserts are pre-generated</span>
      </div>
    );
  }

  return (
    <div className={infoClassName}>
      {editable ? (
        <span className="text-center">
          Reload (Press
          {' '}
          <button
            type="button"
            className="btn border-0 rounded-lg p-1"
            onClick={reloadGeneratorCode}
          >
            <FontAwesomeIcon icon="redo" />
          </button>
          ) Generator/Solution code.
        </span>
      ) : (
        <span className="text-center">Tests are not generated automatically. They are based only on examples</span>
      )}
    </div>
  );
};

function BuilderEditorsWidget() {
  const dispatch = useDispatch();
  const { taskService } = useContext(RoomContext);

  const [assertsPanelShowing, setAssertsPanelShowing] = useState(false);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);
  const isAssertsReady = isTaskAssertsReadySelector(taskCurrent);
  const isAssertsForming = isTaskAssertsFormingSelector(taskCurrent);

  const editable = useSelector(selectors.canEditTaskGenerator);
  const templatesState = useSelector(selectors.taskTemplatesStateSelector);
  const origin = useSelector(selectors.taskOriginSelector);
  const asserts = useSelector(selectors.taskAssertsSelector);
  const assertsStatus = useSelector(selectors.taskAssertsStatusSelector);
  const editorsLang = useSelector(selectors.taskGeneratorLangSelector);
  const textArgumentsGenerator = useSelector(
    selectors.taskTextArgumentsGeneratorSelector,
  );
  const textSolution = useSelector(selectors.taskTextSolutionSelector);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector);
  const editorsMode = useSelector(selectors.editorsModeSelector);

  const [isValidArgumentsGenerator, invalidGeneratorReason] = useSelector(
    state => state.builder.validationStatuses.argumentsGenerator,
  );
  const [isValidSolution, invalidSolutionReason] = useSelector(
    state => state.builder.validationStatuses.solution,
  );

  const reloadCode = useCallback(() => {
    dispatch(reloadGeneratorAndSolutionTemplates(taskService));
  }, [taskService, dispatch]);

  const resetCode = useCallback(() => {
    dispatch(actions.resetGeneratorAndSolution());
    taskService.send('CHANGES');
  }, [dispatch, taskService]);

  const rejectAssertsGeneration = useCallback(() => {
    dispatch(actions.rejectGeneratorAndSolution());
    taskService.send('CHANGES');
  }, [dispatch, taskService]);

  const toggleAssertsPanel = useCallback(() => {
    setAssertsPanelShowing(!assertsPanelShowing);
  }, [setAssertsPanelShowing, assertsPanelShowing]);

  const disabledEditors = templatesState === taskTemplatesStates.none;
  const validationStarts = isAssertsForming;

  const params = {
    editable: editable && !disabledEditors && !validationStarts,
    syntax: editorsLang,
    mode: editorsMode,
    theme,
    mute: true,
    loading: false,
  };

  const changeTaskServiceState = useCallback(() => taskService.send('CHANGES'), [taskService]);
  const handleChanges = isAssertsReady
    ? changeTaskServiceState
    : noop;

  const onChangeGenerator = useCallback(value => {
    handleChanges();

    dispatch(actions.setTaskArgumentsGenerator({ value }));
  }, [dispatch, handleChanges]);
  const onChangeSolution = useCallback(value => {
    handleChanges();

    dispatch(actions.setTaskSolution({ value }));
  }, [dispatch, handleChanges]);

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

  const assertsBadgeClassName = cn('badge ml-1', {
    'badge-light': assertsStatus.status === assertsStatuses.none,
    'badge-warning': assertsStatus.status === assertsStatuses.failure,
    'badge-danger': isGeneratorsError(assertsStatus.status),
    'badge-success': assertsStatus.status === assertsStatuses.success,
  });

  return (
    <>
      <div className="col-12 col-lg-6 p-1" data-editor-state="idle">
        <div
          className="card h-100 shadow-sm position-relative"
          style={gameRoomEditorStyles}
        >
          <div className="rounded-top" data-player-type="current_user">
            <div className="btn-toolbar justify-content-between align-items-center m-1 mb-2" role="toolbar">
              <div className="d-flex justify-content-between">
                <div className="d-flex align-items-center p-1">
                  <div className="py-2">
                    <TaskPropStatusIcon
                      id="editorArgumentsGenerator"
                      status={
                        !isValidArgumentsGenerator
                          ? validationStatuses.invalid
                          : getGeneratorStatus(templatesState, taskCurrent)
                      }
                      reason={invalidSolutionReason}
                    />
                  </div>
                  <h5 className="pt-2">Step 3: Generator</h5>
                </div>
                <div
                  className="btn-group align-items-center ml-2 mr-auto"
                  role="group"
                  aria-label="Editor mode"
                >
                  <VimModeButton playerId={currentUserId} />
                  <DakModeButton playerId={currentUserId} />
                </div>
              </div>
              <div
                className={
                  cn('btn-group justify-content-between align-items-center', {
                    'd-flex': params.edibatle,
                    'd-none': !params.editable,
                  })
                }
              >
                <button
                  title="Reset Code"
                  type="button"
                  className="btn btn-sm btn-light rounded-left"
                  onClick={resetCode}
                >
                  <FontAwesomeIcon className="mr-2" icon="sync" />
                  Reset
                </button>
                <button
                  title="Reject asserts generation"
                  type="button"
                  className="btn btn-sm btn-light ml-1 rounded-right"
                  onClick={rejectAssertsGeneration}
                >
                  <FontAwesomeIcon className="mr-2" icon="window-close" />
                  Reject
                </button>
              </div>
            </div>
          </div>
          <Editor {...generatorParams} />
          {disabledEditors && (
            <InfoPopup editable={editable} reloadGeneratorCode={reloadCode} origin={origin} />
          )}
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1" data-editor-state="idle">
        <div className="card h-100 shadow-sm" style={gameRoomEditorStyles}>
          <div className="rounded-top" data-player-type="current_user">
            <div className="btn-toolbar justify-content-between align-items-center m-1" role="toolbar">
              <div className="d-flex align-items-center p-1">
                <div className="py-2">
                  <TaskPropStatusIcon
                    id="editorSolution"
                    status={
                      !isValidSolution
                        ? validationStatuses.invalid
                        : getGeneratorStatus(templatesState, taskCurrent)
                    }
                    reason={invalidGeneratorReason}
                  />
                </div>
                <h5 className="pt-2">Step 4: Solution Example</h5>
                <button
                  title={assertsPanelShowing ? 'Open solution code' : 'Open task asserts'}
                  type="button"
                  className="btn btn-secondary ml-2 rounded-lg text-nowrap"
                  onClick={toggleAssertsPanel}
                  disabled={assertsStatus.status === 'none'}
                >
                  {assertsPanelShowing ? (
                    <>
                      <FontAwesomeIcon className="mr-2" icon="edit" />
                      Code
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon className="mr-2" icon="tasks" />
                      Asserts
                      {asserts.length !== 0 && <span className={assertsBadgeClassName}>{asserts.length}</span>}
                      {asserts.length === 0 && isGeneratorsError(assertsStatus.status) && <span className={assertsBadgeClassName}>!</span>}
                    </>
                  )}
                </button>
              </div>
              <LanguagePickerView
                currentLangSlug={editorsLang}
                isDisabled
              />
            </div>
          </div>
          <div className={!assertsPanelShowing ? 'd-none' : ''}>
            <AssertsOutput asserts={asserts} {...assertsStatus} />
          </div>
          <div id="editor" className={assertsPanelShowing ? 'd-none' : 'd-flex flex-column flex-grow-1'}>
            <Editor {...solutionParams} />
          </div>
          {disabledEditors && (
            <InfoPopup editable={editable} reloadGeneratorCode={reloadCode} origin={origin} />
          )}
        </div>
      </div>
    </>
  );
}

export default memo(BuilderEditorsWidget);
