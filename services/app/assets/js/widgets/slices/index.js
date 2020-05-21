import chat, { actions as chatActions } from './chat';
import editor, { actions as editorActions } from './editor';
import storeLoaded, { actions as storeLoadedActions } from './store';
import usersInfo, { actions as usersInfoActions } from './usersInfo';
import editorUI, { actions as editorUIActions } from './editorUI';
import gameUI, { actions as gameUIActions } from './gameUI';
import executionOutput, {
  actions as executionOutputActions,
} from './executionOutput';
import playbook, { actions as playbookActions } from './playbook';
import game, { actions as gameActions } from './game';
import gameList, { actions as gameListActions } from './gameList';
import user, { actions as userActions } from './user';

export const actions = {
  ...chatActions,
  ...editorActions,
  ...gameActions,
  ...storeLoadedActions,
  ...executionOutputActions,
  ...playbookActions,
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
  playbook,
  user,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
};
export { makeEditorTextKey } from './editor';
