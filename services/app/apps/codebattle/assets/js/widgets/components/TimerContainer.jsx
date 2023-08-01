import React, { useContext } from 'react';
import CountdownTimer from './CountdownTimer';
import Timer from './Timer';
import RoomContext from '../containers/RoomContext';
import GameRoomModes from '../config/gameModes';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import { roomStateSelector, taskStateSelector } from '../machines/selectors';
import { roomMachineStates } from '../machines/game';
import { taskMachineStates } from '../machines/task';

const gameStatuses = {
  stored: 'stored',
  game_over: 'game_over',
  timeout: 'game_over',
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

export default TimerContainer;
