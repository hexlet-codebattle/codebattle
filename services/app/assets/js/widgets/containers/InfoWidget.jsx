import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import { gameTaskSelector, gameStatusSelector, leftExecutionOutputSelector } from '../selectors';
import Output from '../components/ExecutionOutput/Output';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import CountdownTimer from '../components/CountdownTimer';
import Timer from '../components/Timer';
import GameContext from './GameContext';

const TimerContainer = ({ time, timeoutSeconds, gameStatusName }) => {
  const { current } = useContext(GameContext);

  if (
    current.matches({ game: 'game_over' })
    || current.matches({ game: 'stored' })
  ) {
    return gameStatusName;
  }

  if (timeoutSeconds) {
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} />;
  }

  return <Timer time={time} />;
};

const InfoWidget = () => {
  const { current: gameCurrent } = useContext(GameContext);
  const taskText = useSelector(gameTaskSelector);
  const startsAt = useSelector(state => gameStatusSelector(state).startsAt);
  const timeoutSeconds = useSelector(state => gameStatusSelector(state).timeoutSeconds);
  const gameStatusName = useSelector(state => gameStatusSelector(state).status);
  const leftOutput = useSelector(leftExecutionOutputSelector(gameCurrent));
  const isShowOutput = leftOutput && leftOutput.status;
  const idOutput = 'leftOutput';
  return (
    <>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        <div className="d-flex flex-column h-100">
          <nav>
            <div
              className="nav nav-tabs bg-gray text-uppercase font-weight-bold text-center"
              id="nav-tab"
              role="tablist"
            >
              <a
                className="nav-item nav-link col-3 active rounded-0 px-1 py-2"
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
                className="nav-item nav-link col-3 rounded-0 px-1 py-2"
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
                className="rounded-0 text-center bg-white col-6 text-black px-1 py-2"
              >
                <TimerContainer
                  time={startsAt}
                  timeoutSeconds={timeoutSeconds}
                  gameStatusName={gameStatusName}
                />
              </div>
            </div>
          </nav>
          <div className="tab-content flex-grow-1 overflow-auto " id="nav-tabContent">
            <div
              className="tab-pane fade show active h-100"
              id="task"
              role="tabpanel"
              aria-labelledby="task-tab"
            >
              <Task
                task={taskText}
              />
            </div>
            <div
              className="tab-pane h-100"
              id={idOutput}
              role="tabpanel"
              aria-labelledby={`${idOutput}-tab`}
            >
              {isShowOutput && (
                <>
                  <OutputTab sideOutput={leftOutput} side="left" />
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
};

export default InfoWidget;
