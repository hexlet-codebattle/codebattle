import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initState = {
  users: [],
  messages: [],
};

const chat = handleActions({
  [actions.fetchChatData](state, { payload: { users, messages } }) {
    return { ...state, users, messages };
  },
  [actions.userJoinedChat](state, { payload: { users } }) {
    return { ...state, users };
  },
  [actions.userLeftChat](state, { payload: { users } }) {
    return { ...state, users };
  },
  [actions.newMessageChat](state, { payload: { user, message } }) {
    const { messages } = state;
    const newMessages = [...messages, { user, msg: message }];

    return { ...state, messages: newMessages }
  }
}, initState);

export default chat;
