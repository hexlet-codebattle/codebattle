import { createSlice, current } from '@reduxjs/toolkit';

import defaultRooms from '../config/rooms';
import { ttl, filterPrivateRooms } from '../middlewares/Room';
import { isMessageForCurrentUser, isMessageForCurrentPrivateRoom } from '../utils/chat';

const initialState = {
  users: [],
  messages: [],
  page: 'lobby',
  activeRoom: defaultRooms.general,
  rooms: [defaultRooms.general, defaultRooms.system],
  history: {
    users: [],
    messages: [],
  },
  channel: { online: false },
};

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateChatData: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    updateChatDataHistory: (state, { payload }) => ({
      ...state,
      history: {
        ...payload,
      },
    }),
    userJoinedChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    userLeftChat: (state, { payload: { users } }) => {
      state.users = users;
    },
    newChatMessage: (state, { payload }) => {
      if (isMessageForCurrentUser(payload)) {
        state.rooms = state.rooms.map((room) =>
          isMessageForCurrentPrivateRoom(room, payload)
            ? { ...room, expireTo: room.expireTo + ttl }
            : room,
        );
      }

      state.messages = [...state.messages, payload];
    },
    banUserChat: (state, { payload }) => {
      state.messages = [...state.messages.filter((message) => message.name !== payload.name)];
    },
    setActiveRoom: (state, { payload }) => {
      state.activeRoom = payload;
    },
    createPrivateRoom: (state, { payload }) => {
      const rooms = current(state.rooms);
      const privateRooms = filterPrivateRooms(rooms);
      const existingPrivateRoom = privateRooms.find(
        (room) => room.targetUserId === payload.targetUserId,
      );
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
    updateChatChannelState: (state, { payload }) => {
      state.channel.online = payload;
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
