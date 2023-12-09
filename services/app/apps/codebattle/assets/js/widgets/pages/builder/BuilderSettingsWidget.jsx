import React, { memo, useCallback } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../../selectors';
import { actions } from '../../slices';
import TimerContainer from '../game/TimerContainer';

import BuilderExampleForm from './BuilderExampleForm';
import BuilderStatus from './BuilderStatus';
import BuilderTaskAssignment from './BuilderTaskAssignment';

function BuilderSettingsWidget({
  openFullSizeTaskDescription,
  setConfigurationModalShowing,
}) {
  const dispatch = useDispatch();

  const task = useSelector(selectors.builderTaskSelector);
  const {
    startsAt,
    timeoutSeconds,
    state: gameStateName,
    mode: gameRoomMode,
  } = useSelector(selectors.gameStatusSelector);
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);

  const openTaskConfiguration = useCallback(() => {
    setConfigurationModalShowing(true);
  }, [setConfigurationModalShowing]);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  return (
    <>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <div className="d-flex shadow-sm flex-column h-100">
          <nav>
            <div
              className="nav nav-tabs bg-gray text-uppercase font-weight-bold text-center"
              id="nav-tab"
              role="tablist"
            >
              <a
                className="nav-item nav-link col-3 border-0 active rounded-0 px-1 py-2"
                id="task-tab"
                data-toggle="tab"
                href="#task"
                role="tab"
                aria-controls="task"
                aria-selected="true"
              >
                Step 1
              </a>
              <a
                className="nav-item nav-link col-3 border-0 rounded-0 px-1 py-2"
                id="taskStatus-tab"
                data-toggle="tab"
                href="#taskStatus"
                role="tab"
                aria-controls="taskStatus"
                aria-selected="false"
              >
                Status
              </a>
              <div className="rounded-0 text-center bg-white border-left col-6 text-black px-1 py-2">
                <TimerContainer
                  time={startsAt}
                  mode={gameRoomMode}
                  timeoutSeconds={timeoutSeconds}
                  gameStateName={gameStateName}
                />
              </div>
            </div>
          </nav>
          <div
            className="tab-content flex-grow-1 bg-white rounded-bottom overflow-auto "
            id="nav-tabContent"
          >
            <div
              className="tab-pane fade show active h-100"
              id="task"
              role="tabpanel"
              aria-labelledby="task-tab"
            >
              <BuilderTaskAssignment
                task={task}
                taskLanguage={taskLanguage}
                handleSetLanguage={handleSetLanguage}
                handleOpenFullSizeTaskDescriptio={openFullSizeTaskDescription}
                openConfiguration={openTaskConfiguration}
              />
            </div>
            <div
              className="tab-pane h-100"
              id="taskStatus"
              role="tabpanel"
              aria-labelledby="taskStatus-tab"
            >
              <BuilderStatus task={task} />
            </div>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <BuilderExampleForm />
      </div>
    </>
  );
}

export default memo(BuilderSettingsWidget);
