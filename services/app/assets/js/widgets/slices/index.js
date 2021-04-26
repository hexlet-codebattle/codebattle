import chat, { actions as chatActions } from './chat';
import editor, { actions as editorActions } from './editor';
import storeLoaded, { actions as storeLoadedActions } from './store';
import usersInfo, { actions as usersInfoActions } from './usersInfo';
import gameUI, { actions as gameUIActions } from './gameUI';
import executionOutput, { actions as executionOutputActions } from './executionOutput';
import playbook, { actions as playbookActions } from './playbook';
import game, { actions as gameActions } from './game';
import lobby, { actions as lobbyActions } from './lobby';
import user, { actions as userActions } from './user';
import userSettings, { actions as userSettingActions } from './userSettings';
import leaderboard, { actions as leaderboardActions } from './leaderboard';

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
  ...playbookActions,
  ...usersInfoActions,
  ...gameUIActions,
  ...userActions,
  ...lobbyActions,
  ...leaderboardActions,
  ...userSettingActions,
};

export const redirectToNewGame = gameId => {
  window.location.href = `/games/${gameId}`;
};

export default {
  game,
  usersInfo,
  editor,
  gameUI,
  playbook,
  user,
  chat,
  lobby,
  storeLoaded,
  executionOutput,
  leaderboard,
  userSettings,
};

export { makeEditorTextKey } from './editor';
