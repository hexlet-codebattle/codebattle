import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const initState = {
  users: [],
  messages: [],
};

const chat = createReducer(initState, {
  [actions.fetchChatData](state, { payload }) {
    return payload;
  },
  [actions.userJoinedChat](state, { payload: { users } }) {
    state.users = users;
  },
  [actions.userLeftChat](state, { payload: { users } }) {
    state.users = users;
  },
  [actions.newMessageChat](state, { payload }) {
    state.messages.push(payload);
  },
});

export default chat;
