import React, { useContext } from 'react';

import RoomContext from '../../components/RoomContext';
import {
  isWaitingRoomNoneSelector,
} from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import ArenaInfoWidget from './ArenaInfoWidget';
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
}) => {
  const { waitingRoomService } = useContext(RoomContext);

  const isWaitingRoomNone = useMachineStateSelector(waitingRoomService, isWaitingRoomNoneSelector);

  return (
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
        {isWaitingRoomNone ? (
          <ChatWidget />
        ) : (
          <ArenaInfoWidget />
        )}
      </div>
    </>
  );
};

export default InfoPanel;
