import { createAction } from 'redux-actions';

export const fetchChatData = createAction('FETCH_CHAT_DATA');
export const userJoinedChat = createAction('CHAT_USER_JOINED');
export const userLeftChat = createAction('CHAT_USER_LEFT');
export const newMessageChat = createAction('CHAT_NEW_MESSAGE');

export const finishStoreInit = createAction('FINISH_STORE_INIT');

export const updateExecutionOutput = createAction('UPDATE_EXECUTION_OUTPUT');
