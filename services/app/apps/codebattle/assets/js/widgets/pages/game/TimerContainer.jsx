import React, { useContext } from 'react';

import CountdownTimer from '../../components/CountdownTimer';
import RoomContext from '../../components/RoomContext';
import Timer from '../../components/Timer';
import GameRoomModes from '../../config/gameModes';
import {
  roomStateSelector,
  taskStateSelector,
  inBuilderRoomSelector,
  inPreviewRoomSelector,
  inTestingRoomSelector,
  isGameOverSelector,
  isStoredGameSelector,
  isSavedTaskSelector,
  isReadyTaskSelector,
  isInvalidTaskSelector,
} from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

const gameStatuses = {
  stored: 'stored',
  game_over: 'game_over',
  timeout: 'game_over',
};

const loadingTitle = 'Loading...';

const GameRoomTimer = ({ timeoutSeconds, time }) => {
  if (timeoutSeconds === null) {
    return loadingTitle;
  }

  if (timeoutSeconds && time) {
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} colorized />;
  }

  if (!time) {
    return <></>;
  }

  return <Timer time={time} />;
};

function TimerContainer({
 time, mode, timeoutSeconds, gameStateName,
}) {
  const { mainService, taskService } = useContext(RoomContext);
  const roomMachineState = useMachineStateSelector(mainService, roomStateSelector);
  const taskMachineState = useMachineStateSelector(taskService, taskStateSelector);

  const isPreviewRoom = inPreviewRoomSelector(roomMachineState);
  const isBuilderRoom = inBuilderRoomSelector(roomMachineState);
  const isTestingRoom = inTestingRoomSelector(roomMachineState);
  const isGameOver = isGameOverSelector(roomMachineState);
  const isGameStored = isStoredGameSelector(roomMachineState);

  const isTaskSaved = isSavedTaskSelector(taskMachineState);
  const isTaskReady = isReadyTaskSelector(taskMachineState);
  const isInvalidTask = isInvalidTaskSelector(taskMachineState);

  if (isPreviewRoom) {
    return loadingTitle;
  }

  if (mode === GameRoomModes.history) {
    return 'History';
  }

  if (isBuilderRoom) {
    if (isTaskSaved) {
      return 'Task Saved';
    }

    if (isTaskReady) {
      return 'Task Is Ready';
    }

    if (isInvalidTask) {
      return 'Task Is Invalid';
    }

    return 'Task Builder';
  }

  if (isTestingRoom) {
    return 'Task Testing';
  }

  if (isGameOver || isGameStored) {
    return gameStatuses[gameStateName];
  }

  return <GameRoomTimer timeoutSeconds={timeoutSeconds} time={time} />;
}

export default TimerContainer;
