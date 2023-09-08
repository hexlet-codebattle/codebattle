import React, { useContext, memo } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import {
  inPreviewRoomSelector,
  inTestingRoomSelector,
  roomStateSelector,
} from '../../machines/selectors';
import {
  gameTaskSelector,
  gameStatusSelector,
  leftExecutionOutputSelector,
  builderTaskSelector,
  taskDescriptionLanguageselector,
} from '../../selectors';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import ChatWidget from './ChatWidget';
import Output from './Output';
import OutputTab from './OutputTab';
import TaskAssignment from './TaskAssignment';
import TimerContainer from './TimerContainer';

function InfoWidget() {
  const dispatch = useDispatch();
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);
  const isTestingRoom = inTestingRoomSelector(roomCurrent);
  const isPreviewRoom = inPreviewRoomSelector(roomCurrent);

  const taskLanguage = useSelector(taskDescriptionLanguageselector);
  const task = useSelector(isTestingRoom ? builderTaskSelector : gameTaskSelector);
  const {
    mode: gameRoomMode,
    startsAt,
    state: gameStateName,
    timeoutSeconds,
  } = useSelector(gameStatusSelector);
  const leftOutput = useSelector(leftExecutionOutputSelector(roomCurrent));
  const isShowOutput = leftOutput && leftOutput.status;
  const idOutput = 'leftOutput';

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
                Task
              </a>
              <a
                aria-controls={`${idOutput}`}
                aria-selected="false"
                className="nav-item nav-link col-3 border-0 rounded-0 px-1 py-2"
                data-toggle="tab"
                href={`#${idOutput}`}
                id={`${idOutput}-tab`}
                role="tab"
              >
                Output
              </a>
              <div className="rounded-0 text-center bg-white border-left col-6 text-black px-1 py-2">
                {isPreviewRoom ? (
                  'Loading...'
                ) : (
                  <TimerContainer
                    gameStateName={gameStateName}
                    mode={gameRoomMode}
                    time={startsAt}
                    timeoutSeconds={timeoutSeconds}
                  />
                )}
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
              <TaskAssignment
                handleSetLanguage={handleSetLanguage}
                task={task}
                taskLanguage={taskLanguage}
              />
            </div>
            <div
              aria-labelledby={`${idOutput}-tab`}
              className="tab-pane h-100"
              id={idOutput}
              role="tabpanel"
            >
              {isShowOutput && (
                <>
                  <OutputTab side="left" sideOutput={leftOutput} />
                  <Output sideOutput={leftOutput} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <ChatWidget />
      </div>
    </>
  );
}

export default memo(InfoWidget);
