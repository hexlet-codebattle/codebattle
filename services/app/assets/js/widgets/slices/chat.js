import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  messages: [],
};

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    fetchChatData: (state, { payload }) => payload,
    userJoinedChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    userLeftChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    newMessageChat: (state, { payload }) => {
      state.messages = [...state.messages, payload];
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
