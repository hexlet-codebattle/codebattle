import _ from 'lodash';
import userTypes from '../config/userTypes';
import GameStatusCodes from '../config/gameStatusCodes';
import i18n from '../../i18n';
import { makeEditorTextKey } from '../reducers';
import { defaultEditorHeight } from '../config/editorSettings';

export const currentUserIdSelector = state => state.user.currentUserId;

export const gamePlayersSelector = state => state.game.players;

export const firstPlayerSelector = state => _.find(gamePlayersSelector(state), { type: userTypes.firstPlayer });
export const secondPlayerSelector = state => _.find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

const editorsMetaSelector = state => state.editor.meta;
const editorTextsSelector = state => state.editor.text;

export const editorDataSelector = playerId => (state) => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);
  if (!meta) {
    return null;
  }
  const text = editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug)];
  return {
    ...meta,
    text,
  };
};

export const firstEditorSelector = (state) => {
  const playerId = firstPlayerSelector(state).id;
  return editorDataSelector(playerId)(state);
};

export const secondEditorSelector = (state) => {
  const playerId = secondPlayerSelector(state).id;
  return editorDataSelector(playerId)(state);
};

export const leftEditorSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = (!!player && player.type === userTypes.secondPlayer)
    ? secondEditorSelector
    : firstEditorSelector;
  return editorSelector(state);
};

export const rightEditorSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const editorSelector = (!!player && player.type === userTypes.secondPlayer)
    ? firstEditorSelector
    : secondEditorSelector;
  return editorSelector(state);
};

export const currentPlayerTextByLangSelector = lang => (state) => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = userId => state => _.get(editorDataSelector(userId)(state), 'currentLangSlug', null);

export const gameStatusSelector = state => state.game.gameStatus;

export const gameStatusTitleSelector = (state) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.status) {
    case GameStatusCodes.waitingOpponent:
      return i18n
        .t('{{state}}', { state: i18n.t('Waiting for an opponent') });
    case GameStatusCodes.playing:
      return i18n
        .t('{{state}}', { state: i18n.t('Playing') });
    case GameStatusCodes.gameOver:
      return i18n
        .t('{{state}}', { state: gameStatus.msg });
    default:
      return '';
  }
};

export const gameTaskSelector = state => state.game.task;
export const gameStatusNameSelector = state => state.game.gameStatus.status;

export const gameStartsAtSelector = state => state.game.gameStatus.startsAt;

export const gameLangsSelector = state => state.game.langs;

export const editorHeightSelector = userId => state => _.get(editorDataSelector(userId)(state), 'editorHeight', defaultEditorHeight);

export const executionOutputSelector = userId => state => state.executionOutput[userId];

export const firstExecutionOutputSelector = (state) => {
  const playerId = firstPlayerSelector(state).id;
  return executionOutputSelector(playerId)(state);
};

export const secondExecutionOutputSelector = (state) => {
  const playerId = secondPlayerSelector(state).id;
  return executionOutputSelector(playerId)(state);
};

export const leftExecutionOutputSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = (!!player && player.type === userTypes.secondPlayer)
    ? secondExecutionOutputSelector
    : firstExecutionOutputSelector;
  return outputSelector(state);
};

export const rightExecutionOutputSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const player = _.get(gamePlayersSelector(state), currentUserId, false);
  const outputSelector = (!!player && player.type === userTypes.secondPlayer)
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return outputSelector(state);
};

export const chatUsersSelector = state => state.chat.users;

export const chatMessagesSelector = state => state.chat.messages;

export const currentChatUserSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const currentUser = _.find(chatUsersSelector(state), { id: currentUserId });
  return currentUser;
};

export const activeGamesSelector = (state) => {
  const currentUserId = currentUserIdSelector(state);
  const filterPrivateGamesFunc = ({ users, game_info: { state: gameStatus, is_private: isPrivate } }) => {
    if (gameStatus !== 'waiting_opponent' || !isPrivate) {
      return true;
    }
    return _.some(users, { id: currentUserId });
  };
  const activeGames = _.filter(state.gameList.activeGames, filterPrivateGamesFunc);

  return activeGames || [];
};

export const completedGamesSelector = state => state.gameList.completedGames || [];
