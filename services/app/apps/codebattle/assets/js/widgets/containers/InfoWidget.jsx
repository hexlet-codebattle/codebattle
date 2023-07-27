import React, { useContext, memo } from 'react';
import { useSelector } from 'react-redux';
import ChatWidget from './ChatWidget';
import Task from '../components/Task';
import {
  gameTaskSelector,
  builderTaskSelector,
  gameStatusSelector,
  leftExecutionOutputSelector,
} from '../selectors';
import Output from '../components/ExecutionOutput/Output';
import OutputTab from '../components/ExecutionOutput/OutputTab';
import CountdownTimer from '../components/CountdownTimer';
import Timer from '../components/Timer';
import RoomContext from './RoomContext';
import { roomMachineStates } from '../machines/game';
import {
  taskMachineStates,
  validationStatuses,
  mapStateToValidationStatus,
  getGeneratorStatus,
} from '../machines/task';
import GameRoomModes from '../config/gameModes';
import TaskPropStatusIcon from './TaskPropStatusIcon';
import BuilderExampleForm from './BuilderExampleForm';
import { roomStateSelector, taskStateSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

const gameStatuses = {
  stored: 'stored',
  game_over: 'game_over',
  timeout: 'game_over',
};

const getTaskSelector = roomCurrent => {
  switch (true) {
    case roomCurrent.matches({ room: roomMachineStates.testing }):
    case roomCurrent.matches({ room: roomMachineStates.builder }): {
      return builderTaskSelector;
    }
    default:
      return gameTaskSelector;
  }
};

const TimerContainer = ({
  time, mode, timeoutSeconds, gameStateName,
}) => {
  const { mainService, taskService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);
  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);

  if (mode === GameRoomModes.history) {
    return 'History';
  }

  if (roomCurrent.matches({ room: roomMachineStates.builder })) {
    if (taskCurrent.matches(taskMachineStates.saved)) {
      return 'Task Saved';
    }

    if (taskCurrent.matches(taskMachineStates.ready)) {
      return 'Task Is Ready';
    }

    if (taskCurrent.matches(taskMachineStates.failure)) {
      return 'Task Is Invalid';
    }

    return 'Task Builder';
  }

  if (roomCurrent.matches({ room: roomMachineStates.testing })) {
    return 'Task Testing';
  }

  if (timeoutSeconds === null) {
    return 'Loading...';
  }

  if (
    roomCurrent.matches({ room: roomMachineStates.gameOver })
    || roomCurrent.matches({ room: roomMachineStates.stored })
  ) {
    return gameStatuses[gameStateName];
  }

  if (timeoutSeconds && time) {
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} />;
  }

  return <Timer time={time} />;
};

const TaskStatus = memo(() => {
  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);

  const [isValidName] = useSelector(state => state.builder.validationStatuses.name);
  const [isValidDescription] = useSelector(state => state.builder.validationStatuses.description);
  const [isValidInputSignature] = useSelector(state => state.builder.validationStatuses.inputSignature);
  const [isValidExamples] = useSelector(state => state.builder.validationStatuses.assertsExamples);
  const [isValidArgumentsGenerator] = useSelector(state => state.builder.validationStatuses.argumentsGenerator);
  const [isValidSolution] = useSelector(state => state.builder.validationStatuses.solution);

  const templateState = useSelector(state => state.builder.templates.state);

  return (
    <div className="p-3">
      <p className="small">
        <TaskPropStatusIcon
          status={isValidName ? validationStatuses.valid : validationStatuses.invalid}
        />
        Name
      </p>
      <p className="small">
        <TaskPropStatusIcon
          status={isValidDescription ? validationStatuses.valid : validationStatuses.invalid}
        />
        Description
      </p>
      <p className="small">
        <TaskPropStatusIcon
          status={!isValidInputSignature ? validationStatuses.invalid : mapStateToValidationStatus[taskCurrent.value]}
        />
        Type Signatures
      </p>
      <p className="small">
        <TaskPropStatusIcon
          status={!isValidExamples ? validationStatuses.invalid : mapStateToValidationStatus[taskCurrent.value]}
        />
        Examples
      </p>
      <p className="small">
        <TaskPropStatusIcon
          status={!isValidArgumentsGenerator ? validationStatuses.invalid : getGeneratorStatus(templateState, taskCurrent)}
        />
        Input arguments generator
      </p>
      <p className="small">
        <TaskPropStatusIcon
          status={!isValidSolution ? validationStatuses.invalid : getGeneratorStatus(templateState, taskCurrent)}
        />
        Solution Example
      </p>
    </div>
  );
});

const InfoWidget = () => {
  const { mainService } = useContext(RoomContext);
  const roomCurrent = useMachineStateSelector(mainService, roomStateSelector);

  const taskSelector = getTaskSelector(roomCurrent);
  const task = useSelector(taskSelector);
  const {
    startsAt,
    timeoutSeconds,
    state: gameStateName,
    mode: gameRoomMode,
  } = useSelector(gameStatusSelector);
  const leftOutput = useSelector(leftExecutionOutputSelector(roomCurrent));
  const isShowOutput = leftOutput && leftOutput.status;
  const idOutput = 'leftOutput';

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
              {roomCurrent.matches({ room: roomMachineStates.builder }) ? (
                <>
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
                </>
              ) : (
                <>
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
                </>
              )}
              <div
                className="rounded-0 text-center bg-white border-left col-6 text-black px-1 py-2"
              >
                <TimerContainer
                  time={startsAt}
                  mode={gameRoomMode}
                  timeoutSeconds={timeoutSeconds}
                  gameStateName={gameStateName}
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
              <Task
                task={task}
              />
            </div>
            {roomCurrent.matches({ room: roomMachineStates.builder }) ? (
              <div
                className="tab-pane h-100"
                id="taskStatus"
                role="tabpanel"
                aria-labelledby="taskStatus-tab"
              >
                <TaskStatus task={task} />
              </div>
            ) : (
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
            )}

          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6 p-1 cb-height-info">
        {roomCurrent.matches({ room: roomMachineStates.builder }) ? (
          <BuilderExampleForm />
        ) : (
          <ChatWidget />
        )}
      </div>
    </>
  );
};

export default InfoWidget;
