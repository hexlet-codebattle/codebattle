import React, { useContext } from 'react';

import CountdownTimer from '../../components/CountdownTimer';
import RoomContext from '../../components/RoomContext';
import Timer from '../../components/Timer';
import GameRoomModes from '../../config/gameModes';
import { roomMachineStates } from '../../machines/game';
import { roomStateSelector, taskStateSelector } from '../../machines/selectors';
import { taskMachineStates } from '../../machines/task';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

const gameStatuses = {
  stored: 'stored',
  game_over: 'game_over',
  timeout: 'game_over',
};

function TimerContainer({
 time, mode, timeoutSeconds, gameStateName,
}) {
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
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} colorized />;
  }

  if (!time) {
    return <></>;
  }

  return <Timer time={time} />;
}

export default TimerContainer;
