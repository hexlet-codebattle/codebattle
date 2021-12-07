import _ from 'lodash';
import userTypes from '../config/userTypes';
import GameStateCodes from '../config/gameStateCodes';
import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';
import i18n from '../../i18n';
import { makeEditorTextKey } from '../slices';
import defaultEditorHeight from '../config/editorSettings';
import { replayerMachineStates } from '../machines/game';

export const currentUserIdSelector = state => state.user.currentUserId;

export const currentUserIsAdminSelector = state => state.user.users[state.user.currentUserId].is_admin;

export const isShowGuideSelector = state => state.gameUI.isShowGuide;

export const gamePlayersSelector = state => state.game.players;

export const firstPlayerSelector = state => _.find(gamePlayersSelector(state), { type: userTypes.firstPlayer });

export const secondPlayerSelector = state => _.find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

export const opponentPlayerSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  return _.find(gamePlayersSelector(state), ({ id }) => id !== currentUserId);
};

const editorsMetaSelector = state => state.editor.meta;
export const editorTextsSelector = state => state.editor.text;
export const editorTextsHistorySelector = state => state.editor.textHistory;

export const gameStatusSelector = state => state.game.gameStatus;

export const getSolution = playerId => state => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);

  const { currentLangSlug } = meta;
  const text = editorTexts[makeEditorTextKey(playerId, currentLangSlug)];

  return {
    text,
    lang: currentLangSlug,
  };
};

export const editorDataSelector = (gameCurrent, playerId) => state => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);
  const editorTextsHistory = editorTextsHistorySelector(state);

  if (!meta) {
    return null;
  }
  const text = gameCurrent.matches({ replayer: replayerMachineStates.on })
    ? editorTextsHistory[playerId]
    : editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug)];

  const currentLangSlug = gameCurrent.matches({ replayer: replayerMachineStates.on })
    ? meta.historyCurrentLangSlug
    : meta.currentLangSlug;

  return {
    ...meta,
    text,
    currentLangSlug,
  };
};

export const editorTextHistorySelector = (state, { userId }) => state.editor.textHistory[userId];

export const editorLangHistorySelector = (state, { userId }) => state.editor.langsHistory[userId];

export const firstEditorSelector = (state, gameCurrent) => {
  const playerId = firstPlayerSelector(state).id;
  return editorDataSelector(gameCurrent, playerId)(state);
};

export const secondEditorSelector = (state, gameCurrent) => {
  const playerId = secondPlayerSelector(state).id;
  return editorDataSelector(gameCurrent, playerId)(state);
};

export const leftEditorSelector = gameCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = !!player && player.type === userTypes.secondPlayer
    ? secondEditorSelector
    : firstEditorSelector;
  return editorSelector(state, gameCurrent);
};

export const rightEditorSelector = gameCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = !!player && player.type === userTypes.secondPlayer
    ? firstEditorSelector
    : secondEditorSelector;
  return editorSelector(state, gameCurrent);
};

export const editorSideSelector = (side, gameCurrent) => state => {
  const editors = {
    left: leftEditorSelector,
    right: rightEditorSelector,
  };
  return editors[side](gameCurrent)(state);
};

export const currentPlayerTextByLangSelector = lang => state => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = state => userId => _.get(editorsMetaSelector(state)[userId], 'currentLangSlug', null);

export const gameStatusTitleSelector = state => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.state) {
    case GameStateCodes.waitingOpponent:
      return i18n.t('%{state}', { state: i18n.t('Waiting for an opponent') });
    case GameStateCodes.playing:
      return i18n.t('%{state}', { state: i18n.t('Playing') });
    case GameStateCodes.gameOver:
      return i18n.t('%{state}', { state: gameStatus.msg });
    default:
      return '';
  }
};

export const gameTaskSelector = state => state.game.task;

export const editorLangsSelector = state => state.editor.langs.langs;

export const langInputSelector = state => state.editor.langInput;

export const editorHeightSelector = (gameCurrent, userId) => state => {
  const editorData = editorDataSelector(gameCurrent, userId)(state);
  return _.get(editorData, 'editorHeight', defaultEditorHeight);
};

export const executionOutputSelector = (gameCurrent, userId) => state => (
  gameCurrent.matches({ replayer: replayerMachineStates.on })
  ? state.executionOutput.historyResults[userId]
  : state.executionOutput.results[userId]);

export const firstExecutionOutputSelector = gameCurrent => state => {
  const playerId = firstPlayerSelector(state).id;
  return executionOutputSelector(gameCurrent, playerId)(state);
};

export const secondExecutionOutputSelector = gameCurrent => state => {
  const playerId = secondPlayerSelector(state).id;
  return executionOutputSelector(gameCurrent, playerId)(state);
};

export const leftExecutionOutputSelector = gameCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = !!player && player.type === userTypes.secondPlayer
    ? secondExecutionOutputSelector
    : firstExecutionOutputSelector;
  return outputSelector(gameCurrent)(state);
};

export const rightExecutionOutputSelector = gameCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = !!player && player.type === userTypes.secondPlayer
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return outputSelector(gameCurrent)(state);
};

export const tournamentSelector = state => state.tournament;

export const usersInfoSelector = state => state.usersInfo;

export const chatUsersSelector = state => state.chat.users;

export const chatMessagesSelector = state => state.chat.messages;

export const currentChatUserSelector = state => {
  const currentUserId = currentUserIdSelector(state);

  return _.find(chatUsersSelector(state), { id: currentUserId });
};

export const editorsModeSelector = currentUserId => state => {
  if (_.hasIn(gamePlayersSelector(state), currentUserId)) {
    return state.gameUI.editorMode;
  }
  return editorModes.default;
};

export const editorsThemeSelector = currentUserId => state => {
  if (_.hasIn(gamePlayersSelector(state), currentUserId)) {
    return state.gameUI.editorTheme;
  }
  return editorThemes.dark;
};

export const taskDescriptionLanguageselector = state => state.gameUI.taskDescriptionLanguage;

export const playbookStatusSelector = state => state.playbook.state;

export const playbookInitRecordsSelector = state => state.playbook.initRecords;

export const playbookRecordsSelector = state => state.playbook.records;

export const lobbyDataSelector = state => state.lobby;

export const usersStatsSelector = state => state.user.usersStats;

export const usersListSelector = state => state.user.usersRatingPage;

export const gameTypeSelector = state => state.game.gameStatus.type;

export const userSettingsSelector = state => state.userSettings;

export const isOpponentInGameSelector = state => {
  const findedUser = _.find(chatUsersSelector(state), {
    id: opponentPlayerSelector(state).id,
  });
  return !_.isUndefined(findedUser);
};

export const currentUserNameSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  if (!currentUserId) {
    return 'Anonymous user';
  }
  return state.user.users[currentUserId].name;
};
