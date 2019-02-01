import { createAction } from 'redux-actions';

export const fetchChatData = createAction('FETCH_CHAT_DATA');
export const userJoinedChat = createAction('CHAT_USER_JOINED');
export const userLeftChat = createAction('CHAT_USER_LEFT');
export const newMessageChat = createAction('CHAT_NEW_MESSAGE');

export const fetchGameList = createAction('FETCH_GAME_LIST');
export const newGameLobby = createAction('LOBBY_NEW_GAME');
export const updateGameLobby = createAction('LOBBY_UPDATE_GAME');
export const cancelGameLobby = createAction('LOBBY_CANCEL_GAME');

export const finishStoreInit = createAction('FINISH_STORE_INIT');

export const updateExecutionOutput = createAction('UPDATE_EXECUTION_OUTPUT');

export const setCurrentUser = createAction('SET_CURRENT_USER');
export const updateUsers = createAction('UPDATE_USERS');
export const updateUsersStats = createAction('UPDATE_USERS_STATS');

export const sendPlayerCode = createAction('SEND_PLAYER_CODE');
export const updateEditorLang = createAction('UPDATE_EDITOR_LANG');
export const updateEditorText = createAction('UPDATE_EDITOR_TEXT');

export const updateGameStatus = createAction('UPDATE_GAME_STATUS');
export const setGameTask = createAction('SET_GAME_TASK');
export const updateGamePlayers = createAction('UPDATE_GAME_PLAYERS');

export const updateCheckStatus = createAction('UPDATE_CHECK_STATUS');

export const compressEditorHeight = createAction('COMPRESS_EDITOR_HEIGHT');
export const expandEditorHeight = createAction('EXPAND_EDITOR_HEIGHT');

export const setEditorsMode = createAction('EDITORS_MODE_SET');
