import { networkMachineStates, replayerMachineStates, roomMachineStates } from './game';
import { spectatorEditorMachineStates } from './spectator';
import { taskMachineStates } from './task';

const stateSelector = (state: any) => state;

export const roomStateSelector = stateSelector;

export const taskStateSelector = stateSelector;

export const editorStateSelector = stateSelector;

export const spectatorStateSelector = stateSelector;

export const inPreviewRoomSelector = (state: any) =>
  state.matches({ room: roomMachineStates.preview });

export const isRestrictedContentSelector = (state: any) =>
  state.matches({ room: roomMachineStates.restricted });

export const isGameActiveSelector = (state: any) =>
  state.matches({ room: roomMachineStates.active });

export const isGameOverSelector = (state: any) =>
  state.matches({ room: roomMachineStates.gameOver });

export const isStoredGameSelector = (state: any) =>
  state.matches({ room: roomMachineStates.stored });

export const inWaitingOpponentStateSelector = (state: any) =>
  state.matches({ room: roomMachineStates.waiting });

export const openedReplayerSelector = (state: any) =>
  state.matches({ replayer: replayerMachineStates.on });

export const spectatorEditorIsIdle = (state: any) =>
  state.matches({ editor: spectatorEditorMachineStates.idle });

export const spectatorEditorIsLoading = (state: any) =>
  state.matches({ editor: spectatorEditorMachineStates.loading });

export const spectatorEditorIsChecking = (state: any) =>
  state.matches({ editor: spectatorEditorMachineStates.checking });

export const gameRoomKeySelector = () => 'game';

export const isInvalidTaskSelector = (state: any) =>
  state.matches((taskMachineStates as any).invalid);

export const isIdleStateTaskSelector = (state: any) => state.matches(taskMachineStates.idle);

export const isSavedTaskSelector = (state: any) => state.matches(taskMachineStates.saved);

export const isReadyTaskSelector = (state: any) => state.matches(taskMachineStates.ready);

export const isTaskAssertsReadySelector = (state: any) =>
  [taskMachineStates.ready, taskMachineStates.saved].some(state.matches);

export const isTaskPrepareSavingSelector = (state: any) =>
  state.matches(taskMachineStates.prepareSaving);

export const isTaskPrepareTestingSelector = (state: any) =>
  state.matches(taskMachineStates.prepareTesting);

export const isTaskAssertsFormingSelector = (state: any) =>
  [taskMachineStates.prepareSaving, taskMachineStates.prepareTesting].some(state.matches);

export const isDisconnectedWithMessageSelector = (state: any) =>
  state.matches({ network: networkMachineStates.disconnectedWithMessage });
