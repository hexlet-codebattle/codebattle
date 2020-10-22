import chat, { actions as chatActions } from './chat';
import editor, { actions as editorActions } from './editor';
import storeLoaded, { actions as storeLoadedActions } from './store';
import usersInfo, { actions as usersInfoActions } from './usersInfo';
import editorUI, { actions as editorUIActions } from './editorUI';
import gameUI, { actions as gameUIActions } from './gameUI';
import executionOutput, { actions as executionOutputActions } from './executionOutput';
import game, { actions as gameActions } from './game';
import gameList, { actions as gameListActions } from './gameList';
import gameSession, { actions as gameSessionActions } from './gameSession';
import user, { actions as userActions } from './user';

const setError = error => ({
  type: 'ERROR',
  error: true,
  payload: error,
});

export const actions = {
  setError,
  ...chatActions,
  ...editorActions,
  ...gameActions,
  ...storeLoadedActions,
  ...executionOutputActions,
  ...gameSessionActions,
  ...usersInfoActions,
  ...editorUIActions,
  ...gameUIActions,
  ...userActions,
  ...gameListActions,
};

export const redirectToNewGame = gameId => {
  window.location.href = `/games/${gameId}`;
};

export default {
  game,
  usersInfo,
  editor,
  editorUI,
  gameUI,
  gameSession,
  user,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
};
export { makeEditorTextKey } from './editor';
