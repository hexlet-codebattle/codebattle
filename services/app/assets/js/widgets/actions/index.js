import { createAction } from '@reduxjs/toolkit';

export const fetchChatData = createAction('FETCH_CHAT_DATA');
export const userJoinedChat = createAction('CHAT_USER_JOINED');
export const userLeftChat = createAction('CHAT_USER_LEFT');
export const newMessageChat = createAction('CHAT_NEW_MESSAGE');

export const initGameList = createAction('INIT_GAME_LIST');
export const upsertGameLobby = createAction('LOBBY_UPSERT_GAME');
export const removeGameLobby = createAction('LOBBY_REMOVE_GAME');
export const finishGame = createAction('LOBBY_FINISH_GAME');

export const finishStoreInit = createAction('FINISH_STORE_INIT');

export const updateExecutionOutput = createAction('UPDATE_EXECUTION_OUTPUT');

export const setCurrentUser = createAction('SET_CURRENT_USER');
export const updateUsers = createAction('UPDATE_USERS');
export const updateUsersStats = createAction('UPDATE_USERS_STATS');
export const updateUsersRatingPage = createAction('UPDATE_USERS_RATING_PAGE');

export const sendPlayerCode = createAction('SEND_PLAYER_CODE');
export const updateEditorLang = createAction('UPDATE_EDITOR_LANG');
export const updateEditorText = createAction('UPDATE_EDITOR_TEXT');
export const updateEditorTextPlaybook = createAction('UPDATE_EDITOR_TEXT_PLAYBOOK');
export const setLangs = createAction('SET_LANGS');

export const updateGameStatus = createAction('UPDATE_GAME_STATUS');
export const setGameTask = createAction('SET_GAME_TASK');
export const updateGamePlayers = createAction('UPDATE_GAME_PLAYERS');

export const updateCheckStatus = createAction('UPDATE_CHECK_STATUS');

export const compressEditorHeight = createAction('COMPRESS_EDITOR_HEIGHT');
export const expandEditorHeight = createAction('EXPAND_EDITOR_HEIGHT');

export const setEditorsMode = createAction('EDITORS_MODE_SET');
export const updateGameUI = createAction('UPDATE_GAME_UI');
export const switchEditorsTheme = createAction('SWITCH_EDITORS_THEME');
export const redirectToNewGame = gameId => {
  window.location.href = `/games/${gameId}`;
};

export const selectNewGameTimeout = createAction('SELECT_NEW_GAME_TIMEOUT');

export const loadStoredPlaybook = createAction('LOAD_PLAYBOOK');
export const loadActivePlaybook = createAction('LOAD_ACTIVE_PLAYBOOK');
export const updateRecords = createAction('UPDATE_RECORDS');
export const setStepCoefficient = createAction('SET_STEP_COEFFICIENT');

export const setUserInfo = createAction('SET_USER_INFO');
