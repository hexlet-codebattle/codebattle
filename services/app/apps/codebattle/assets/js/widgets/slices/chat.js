import { createSlice, current } from '@reduxjs/toolkit';

import rooms from '../config/rooms';
import {
  isMessageForCurrentUser,
  isMessageForCurrentPrivateRoom,
} from '../utils/chat';
import { ttl } from '../middlewares/Room';

const initialState = {
  users: [],
  messages: [],
  page: 'lobby',
  activeRoom: rooms.general,
  rooms: [rooms.general],
  history: {
    users: [],
    messages: [],
  },
};

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateChatData: (state, { payload }) => {
      const { messages } = payload;

      return {
        ...state,
        ...payload,
        messages,
      };
    },
    updateChatDataHistory: (state, { payload }) => {
      const { messages } = payload;

      return {
        ...state,
        history: {
          ...payload,
          messages,
        },
      };
    },
    userJoinedChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    userLeftChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    newChatMessage: (state, { payload }) => {
      if (isMessageForCurrentUser(payload)) {
        state.rooms = state.rooms.map(room => (
          isMessageForCurrentPrivateRoom(room, payload)
            ? { ...room, expireTo: room.expireTo + ttl }
            : room
        ));
      }

      state.messages = [...state.messages, payload];
    },
    banUserChat: (state, { payload }) => {
      state.messages = [
        ...state.messages.filter(message => message.name !== payload.name),
      ];
    },
    setActiveRoom: (state, { payload }) => {
      state.activeRoom = payload;
    },
    createPrivateRoom: (state, { payload }) => {
      const privateRooms = current(state.rooms).slice(1);
      const existingPrivateRoom = privateRooms.find(room => (
        room.id === payload.id
      ));
      if (existingPrivateRoom) {
        state.activeRoom = existingPrivateRoom;
        return;
      }
      state.rooms = [...state.rooms, payload];
      state.activeRoom = payload;
    },
    setPrivateRooms: (state, { payload }) => {
      state.rooms = [...state.rooms, ...payload];
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
