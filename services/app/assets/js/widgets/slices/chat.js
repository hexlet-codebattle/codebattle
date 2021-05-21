import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  messages: [],
  history: {
    users: [],
    messages: [],
  },
};

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateChatData: (state, { payload }) => ({ ...state, ...payload }),
    updateChatDataHistory: (state, { payload }) => ({
      ...state,
      history: payload,
    }),
    userJoinedChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    userLeftChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    newMessageChat: (state, { payload }) => {
      state.messages = [...state.messages, payload];
    },
    banUserChat: (state, { payload }) => {
      state.messages = [
        ...state.messages.filter(message => message.name !== payload.name),
      ];
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
