import { networkMachineStates, replayerMachineStates, roomMachineStates } from './game';
import { spectatorEditorMachineStates } from './spectator';
import { taskMachineStates } from './task';
import { waitingRoomMachineStates } from './waitingRoom';

const stateSelector = state => state;

export const roomStateSelector = stateSelector;

export const taskStateSelector = stateSelector;

export const editorStateSelector = stateSelector;

export const waitingRoomStateSelector = stateSelector;

export const spectatorStateSelector = stateSelector;

export const inPreviewRoomSelector = state => state.matches({ room: roomMachineStates.preview });

export const isRestrictedContentSelector = state => state.matches({ room: roomMachineStates.restricted });

export const inTestingRoomSelector = state => state.matches({ room: roomMachineStates.testing });

export const isGameActiveSelector = state => state.matches({ room: roomMachineStates.active });

export const isGameOverSelector = state => state.matches({ room: roomMachineStates.gameOver });

export const isStoredGameSelector = state => state.matches({ room: roomMachineStates.stored });

export const inBuilderRoomSelector = state => state.matches({ room: roomMachineStates.builder });

export const inWaitingOpponentStateSelector = state => state.matches({ room: roomMachineStates.waiting });

export const openedReplayerSelector = state => state.matches({ replayer: replayerMachineStates.on });

export const spectatorEditorIsIdle = state => state.matches({ editor: spectatorEditorMachineStates.idle });

export const spectatorEditorIsLoading = state => state.matches({ editor: spectatorEditorMachineStates.loading });

export const spectatorEditorIsChecking = state => state.matches({ editor: spectatorEditorMachineStates.checking });

export const gameRoomKeySelector = () => ('game');

export const isInvalidTaskSelector = state => state.matches(taskMachineStates.invalid);

export const isIdleStateTaskSelector = state => state.matches(taskMachineStates.idle);

export const isSavedTaskSelector = state => state.matches(taskMachineStates.saved);

export const isReadyTaskSelector = state => state.matches(taskMachineStates.ready);

export const isTaskAssertsReadySelector = state => [taskMachineStates.ready, taskMachineStates.saved].some(state.matches);

export const isTaskPrepareSavingSelector = state => state.matches(taskMachineStates.prepareSaving);

export const isTaskPrepareTestingSelector = state => state.matches(taskMachineStates.prepareTesting);

export const isWaitingRoomActiveSelector = state => state.matches({
  status: waitingRoomMachineStates.room.active,
});

export const isMatchmakingPausedSelector = state => state.matches({
  player: waitingRoomMachineStates.matchmaking.paused,
});

export const isMatchmakingInProgressSelector = state => state.matches({
  player: waitingRoomMachineStates.matchmaking.progress,
});

export const isPlayerIdleSelector = state => state.matches({
  player: waitingRoomMachineStates.player.idle,
});

export const isPlayerBannedSelector = state => state.matches({
  player: waitingRoomMachineStates.player.banned,
});

export const isWaitingRoomInactiveSelector = state => state.matches({
  status: waitingRoomMachineStates.room.inactive,
});

export const isWaitingRoomNoneSelector = state => state.matches({
  status: waitingRoomMachineStates.room.none,
});

export const isTaskAssertsFormingSelector = state => [
  taskMachineStates.prepareSaving,
  taskMachineStates.prepareTesting,
].some(state.matches);

export const isDisconnectedWithMessageSelector = state => state.matches({ network: networkMachineStates.disconnectedWithMessage });
