import { createAction } from 'redux-actions';

export const fetchChatData = createAction('FETCH_CHAT_DATA');
export const userJoinedChat = createAction('CHAT_USER_JOINED');
export const userLeftChat = createAction('CHAT_USER_LEFT');
