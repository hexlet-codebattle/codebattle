import _ from 'lodash';
import userTypes from '../config/userTypes';
import GameStatusCodes from '../config/gameStatusCodes';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';
import i18n from '../../i18n';
import { makeEditorTextKey } from '../reducers';
import defaultEditorHeight from '../config/editorSettings';

export const currentUserIdSelector = state => state.user.currentUserId;

export const gamePlayersSelector = state => state.game.players;

export const firstPlayerSelector = state => _
  .find(gamePlayersSelector(state), { type: userTypes.firstPlayer });

export const secondPlayerSelector = state => _
  .find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

export const opponentPlayerSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  return _.find(gamePlayersSelector(state), ({ id }) => (id !== currentUserId));
};

const editorsMetaSelector = state => state.editor.meta;
export const editorTextsSelector = state => state.editor.text;
export const editorTextsPlaybookSelector = state => state.editor.textPlaybook;

export const gameStatusSelector = state => state.game.gameStatus;

export const editorDataSelector = playerId => state => {
  const isStoredGame = gameStatusSelector(state).status === GameStatusCodes.stored;
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);
  const editorTextsPlaybook = editorTextsPlaybookSelector(state);

  if (!meta) {
    return null;
  }
  const text = isStoredGame
    ? editorTextsPlaybook[playerId]
    : editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug)];
  return {
    ...meta,
    text,
  };
};

export const getEditorTextPlaybook = (state, userId) => state.editor.textPlaybook[userId];

export const firstEditorSelector = state => {
  const playerId = firstPlayerSelector(state).id;
  return editorDataSelector(playerId)(state);
};

export const secondEditorSelector = state => {
  const playerId = secondPlayerSelector(state).id;
  return editorDataSelector(playerId)(state);
};

export const leftEditorSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = (!!player && player.type === userTypes.secondPlayer)
    ? secondEditorSelector
    : firstEditorSelector;
  return editorSelector(state);
};

export const rightEditorSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = (!!player && player.type === userTypes.secondPlayer)
    ? firstEditorSelector
    : secondEditorSelector;
  return editorSelector(state);
};

export const currentPlayerTextByLangSelector = lang => state => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = userId => state => _.get(editorDataSelector(userId)(state), 'currentLangSlug', null);

export const gameStatusTitleSelector = state => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.status) {
    case GameStatusCodes.waitingOpponent:
      return i18n
        .t('%{state}', { state: i18n.t('Waiting for an opponent') });
    case GameStatusCodes.playing:
      return i18n
        .t('%{state}', { state: i18n.t('Playing') });
    case GameStatusCodes.gameOver:
      return i18n
        .t('%{state}', { state: gameStatus.msg });
    default:
      return '';
  }
};

export const gameTaskSelector = state => state.game.task;

export const editorLangsSelector = state => state.editor.langs.langs;

export const editorHeightSelector = userId => state => _.get(editorDataSelector(userId)(state), 'editorHeight', defaultEditorHeight);

export const executionOutputSelector = userId => state => state.executionOutput[userId];

export const firstExecutionOutputSelector = state => {
  const playerId = firstPlayerSelector(state).id;
  return executionOutputSelector(playerId)(state);
};

export const secondExecutionOutputSelector = state => {
  const playerId = secondPlayerSelector(state).id;
  return executionOutputSelector(playerId)(state);
};

export const leftExecutionOutputSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = (!!player && player.type === userTypes.secondPlayer)
    ? secondExecutionOutputSelector
    : firstExecutionOutputSelector;
  return outputSelector(state);
};

export const rightExecutionOutputSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = (!!player && player.type === userTypes.secondPlayer)
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return outputSelector(state);
};

export const getUsersInfo = state => state.usersInfo;

export const chatUsersSelector = state => state.chat.users;

export const chatMessagesSelector = state => state.chat.messages;

export const currentChatUserSelector = state => {
  const currentUserId = currentUserIdSelector(state);

  return _.find(chatUsersSelector(state), { id: currentUserId });
};

export const editorsModeSelector = currentUserId => state => {
  if (_.hasIn(gamePlayersSelector(state), currentUserId)) {
    return state.editorUI.mode;
  }
  return EditorModes.default;
};

export const editorsThemeSelector = currentUserId => state => {
  if (_.hasIn(gamePlayersSelector(state), currentUserId)) {
    return state.editorUI.theme;
  }
  return EditorThemes.dark;
};

export const getPlaybookStatus = state => state.playbook.status;

export const getPlaybookInitRecords = state => state.playbook.initRecords;

export const getPlaybookRecords = state => state.playbook.records;

export const getStepCoefficient = state => state.playbook.stepCoefficient;

export const gameListSelector = state => state.gameList;

export const getUsersStats = state => state.user.usersStats;

export const getUsersList = state => state.user.usersRatingPage;

export const isOpponentInGame = state => {
  const findedUser = _.find(chatUsersSelector(state), { id: opponentPlayerSelector(state).id });
  return !_.isUndefined(findedUser);
};

export const  replayerModeSelector = state => state.replayerMode;
