import React, { useContext, memo } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import BattleRoomViewModes from '../../config/battleRoomViewModes';
import {
  inTestingRoomSelector,
  isRestrictedContentSelector,
  roomStateSelector,
} from '../../machines/selectors';
import {
  gameTaskSelector,
  gameStatusSelector,
  builderTaskSelector,
  taskDescriptionLanguageselector,
} from '../../selectors';
import { actions } from '../../slices';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import usePlayerOutputForInfoPanel from '../../utils/usePlayerOutputForInfoPanel';

import ChatWidget from './ChatWidget';
import Output from './Output';
import OutputTab from './OutputTab';
import TaskAssignment from './TaskAssignment';
import TimerContainer from './TimerContainer';

const InfoPanel = ({
  idOutput = 'leftOutput',
  canShowOutputPanel,
  outputData,
  timerProps,
  taskPanelProps,
}) => (
  <>
    <div className="col-12 col-lg-6 p-1 cb-height-info">
      <div className="d-flex shadow-sm flex-column h-100">
        <nav>
          <div
            className="nav nav-tabs text-uppercase font-weight-bold text-center"
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
              Task
            </a>
            <a
              className="nav-item nav-link col-3 border-0 rounded-0 px-1 py-2"
              id={`${idOutput}-tab`}
              data-toggle="tab"
              href={`#${idOutput}`}
              role="tab"
              aria-controls={`${idOutput}`}
              aria-selected="false"
            >
              Output
            </a>
            <div
              className="rounded-0 text-center bg-white border-left col-6 text-black px-1 py-2"
            >
              <TimerContainer
                {...timerProps}
              />
            </div>
          </div>
        </nav>
        <div className="tab-content flex-grow-1 bg-white rounded-bottom overflow-auto " id="nav-tabContent">
          <div
            className="tab-pane fade show active h-100"
            id="task"
            role="tabpanel"
            aria-labelledby="task-tab"
          >
            <TaskAssignment
              {...taskPanelProps}
            />
          </div>
          <div
            className="tab-pane h-100 user-select-none"
            id={idOutput}
            role="tabpanel"
            aria-labelledby={`${idOutput}-tab`}
          >
            {canShowOutputPanel && (
              <>
                <OutputTab sideOutput={outputData} side="left" />
                <Output sideOutput={outputData} />
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

const SideInfoPanel = ({
  // timerProps,
  taskPanelProps,
  outputData,
}) => (
  <div
    className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1"
    style={{ height: 'calc(100vh - 92px)' }}
  >
    <div>
      <TaskAssignment {...taskPanelProps} />
    </div>
    <div
      className="card border-0 shadow-sm mt-1 cb-overflow-y-auto"
    >
      <div
        className="d-flex justify-content-around align-items-center w-100 p-2"
      >
        {/* <TimerContainer {...timerProps} /> */}
        <OutputTab sideOutput={outputData} large />
      </div>
      <div
        className="d-flex flex-column w-100 h-100 user-select-none cb-overflow-y-auto"
      >
        <Output hideContent={taskPanelProps.hideContent} sideOutput={outputData} />
      </div>
    </div>
  </div>
);

function InfoWidget({ viewMode }) {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);

  const isTestingRoom = inTestingRoomSelector(roomMachineState);
  const isRestricted = isRestrictedContentSelector(roomMachineState);

  const taskLanguage = useSelector(taskDescriptionLanguageselector);
  const task = useSelector(isTestingRoom ? builderTaskSelector : gameTaskSelector);
  const {
    startsAt,
    timeoutSeconds,
    state: gameStateName,
    mode,
    tournamentId,
  } = useSelector(gameStatusSelector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  const timerProps = {
    time: startsAt,
    mode,
    timeoutSeconds,
    gameStateName,
  };
  const taskPanelProps = {
    task,
    taskLanguage,
    handleSetLanguage,
    hideContribution: !!tournamentId,
    hideGuide: !!tournamentId,
    hideContent: isRestricted,
  };
  const { outputData, canShowOutput } = usePlayerOutputForInfoPanel(viewMode, roomMachineState);

  return (
    <>
      {viewMode === BattleRoomViewModes.duel && (
        <InfoPanel
          canShowOutputPanel={canShowOutput}
          timerProps={timerProps}
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
      {viewMode === BattleRoomViewModes.single && (
        <SideInfoPanel
          timerProps={timerProps}
          taskPanelProps={taskPanelProps}
          outputData={outputData}
        />
      )}
    </>
  );
}

export default memo(InfoWidget);
