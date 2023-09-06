import builder, { actions as builderActions } from './builder';
import chat, { actions as chatActions } from './chat';
import completedGames, {
  actions as completedGamesActions,
} from './completedGames';
import editor, { actions as editorActions } from './editor';
import executionOutput, {
  actions as executionOutputActions,
} from './executionOutput';
import game, { actions as gameActions } from './game';
import gameUI, { actions as gameUIActions } from './gameUI';
import invites, { actions as invitesActions } from './invites';
import leaderboard, { actions as leaderboardActions } from './leaderboard';
import lobby, { actions as lobbyActions } from './lobby';
import playbook, { actions as playbookActions } from './playbook';
import stairwayGame, { actions as stairwayGameActions } from './stairway';
import storeLoaded, { actions as storeLoadedActions } from './store';
import tournament, { actions as tournamentActions } from './tournament';
import user, { actions as userActions } from './user';
import userSettings, { actions as userSettingActions } from './userSettings';
import usersInfo, { actions as usersInfoActions } from './usersInfo';

const setError = error => ({
  type: 'ERROR',
  error: true,
  payload: error,
});

export const actions = {
  setError,
  ...builderActions,
  ...chatActions,
  ...completedGamesActions,
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
  ...invitesActions,
  ...userSettingActions,
  ...stairwayGameActions,
  ...tournamentActions,
};

export const redirectToNewGame = gameId => {
  window.location.href = `/games/${gameId}`;
};

export default {
  game,
  builder,
  usersInfo,
  editor,
  gameUI,
  playbook,
  user,
  chat,
  completedGames,
  lobby,
  storeLoaded,
  executionOutput,
  leaderboard,
  invites,
  userSettings,
  stairwayGame,
  tournament,
};
