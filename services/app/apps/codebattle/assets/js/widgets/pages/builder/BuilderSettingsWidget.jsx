import React, { memo, useCallback } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import * as selectors from '../../selectors';
import { actions } from '../../slices';
import TimerContainer from '../game/TimerContainer';

import BuilderExampleForm from './BuilderExampleForm';
import BuilderStatus from './BuilderStatus';
import BuilderTaskAssignment from './BuilderTaskAssignment';

function BuilderSettingsWidget({ setConfigurationModalShowing }) {
  const dispatch = useDispatch();

  const task = useSelector(selectors.builderTaskSelector);
  const {
    mode: gameRoomMode,
    startsAt,
    state: gameStateName,
    timeoutSeconds,
  } = useSelector(selectors.gameStatusSelector);
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);

  const openTaskConfiguration = useCallback(() => {
    setConfigurationModalShowing(true);
  }, [setConfigurationModalShowing]);

  const handleSetLanguage = (lang) => () => dispatch(actions.setTaskDescriptionLanguage(lang));

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
                aria-controls="task"
                aria-selected="true"
                className="nav-item nav-link col-3 border-0 active rounded-0 px-1 py-2"
                data-toggle="tab"
                href="#task"
                id="task-tab"
                role="tab"
              >
                Step 1
              </a>
              <a
                aria-controls="taskStatus"
                aria-selected="false"
                className="nav-item nav-link col-3 border-0 rounded-0 px-1 py-2"
                data-toggle="tab"
                href="#taskStatus"
                id="taskStatus-tab"
                role="tab"
              >
                Status
              </a>
              <div className="rounded-0 text-center bg-white border-left col-6 text-black px-1 py-2">
                <TimerContainer
                  gameStateName={gameStateName}
                  mode={gameRoomMode}
                  time={startsAt}
                  timeoutSeconds={timeoutSeconds}
                />
              </div>
            </div>
          </nav>
          <div
            className="tab-content flex-grow-1 bg-white rounded-bottom overflow-auto "
            id="nav-tabContent"
          >
            <div
              aria-labelledby="task-tab"
              className="tab-pane fade show active h-100"
              id="task"
              role="tabpanel"
            >
              <BuilderTaskAssignment
                handleSetLanguage={handleSetLanguage}
                openConfiguration={openTaskConfiguration}
                task={task}
                taskLanguage={taskLanguage}
              />
            </div>
            <div
              aria-labelledby="taskStatus-tab"
              className="tab-pane h-100"
              id="taskStatus"
              role="tabpanel"
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
