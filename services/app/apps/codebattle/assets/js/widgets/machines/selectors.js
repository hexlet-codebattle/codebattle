import { networkMachineStates, replayerMachineStates, roomMachineStates } from './game';
import { taskMachineStates } from './task';

const stateSelector = (state) => state;

export const roomStateSelector = stateSelector;

export const taskStateSelector = stateSelector;

export const editorStateSelector = stateSelector;

export const inPreviewRoomSelector = (state) => state.matches({ room: roomMachineStates.preview });

export const inTestingRoomSelector = (state) => state.matches({ room: roomMachineStates.testing });

export const isGameActiveSelector = (state) => state.matches({ room: roomMachineStates.active });

export const isGameOverSelector = (state) => state.matches({ room: roomMachineStates.gameOver });

export const inBuilderRoomSelector = (state) => state.matches({ room: roomMachineStates.builder });

export const inWaitingRoomSelector = (state) => state.matches({ room: roomMachineStates.waiting });

export const openedReplayerSelector = (state) =>
  state.matches({ replayer: replayerMachineStates.on });

export const gameRoomKeySelector = () => 'game';

export const isInvalidStateTaskSelector = (state) => state.matches(taskMachineStates.invalid);

export const isIdleStateTaskSelector = (state) => state.matches(taskMachineStates.idle);

export const isSavedStateTaskSelector = (state) => state.matches(taskMachineStates.saved);

export const isTaskAssertsReadySelector = (state) =>
  [taskMachineStates.ready, taskMachineStates.saved].some(state.matches);

export const isTaskPrepareSavingSelector = (state) =>
  state.matches(taskMachineStates.prepareSaving);

export const isTaskPrepareTestingSelector = (state) =>
  state.matches(taskMachineStates.prepareTesting);

export const isTaskAssertsFormingSelector = (state) =>
  [taskMachineStates.prepareSaving, taskMachineStates.prepareTesting].some(state.matches);

export const isDisconnectedWithMessageSelector = (state) =>
  state.matches({ network: networkMachineStates.disconnectedWithMessage });
