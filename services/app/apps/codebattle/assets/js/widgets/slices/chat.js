import { createSlice, current } from '@reduxjs/toolkit';
import Gon from 'gon';

import messageTypes from '../config/messageTypes';
import rooms from '../config/rooms';

const currentUser = Gon.getAsset('current_user');

const getPrivateRooms = page => {
  const storedPrivateRooms = JSON.parse(localStorage.getItem(`${page}_private_rooms`));

  return storedPrivateRooms || [];
};

const isProperPrivateRoomActive = (message, room) => (
  (room.id === message.meta.userId && message.userId === currentUser.id)
  || (room.id === message.userId && message.meta.userId === currentUser.id)
);

const isGeneralRoomActive = room => room.id === null;

const shouldShowMessage = (message, room) => {
  switch (message.meta?.type) {
    case messageTypes.private:
      return isProperPrivateRoomActive(message, room) || isGeneralRoomActive(room);
    case messageTypes.general:
      return isGeneralRoomActive(room);
    default:
      return true;
  }
};

const initialState = {
  users: [],
  messages: [],
  page: 'lobby',
  allMessages: [],
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
    updateChatData: (state, { payload }) => ({
      ...state,
      ...payload,
      rooms: [...state.rooms, ...getPrivateRooms(payload.page)],
      allMessages: payload.messages,
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
    newMessageChat: (state, { payload }) => {
      if (shouldShowMessage(payload, state.activeRoom)) {
        state.messages = [...state.messages, payload];
      }
      state.allMessages = [...state.allMessages, payload];
    },
    banUserChat: (state, { payload }) => {
      state.messages = [
        ...state.messages.filter(message => message.name !== payload.name),
      ];
    },
    setActiveRoom: (state, { payload }) => {
      state.activeRoom = payload;
      state.messages = payload.id === null
        ? state.allMessages
        : state.allMessages.filter(message => shouldShowMessage(message, payload));
    },
    createPrivateRoom: (state, { payload }) => {
      const privateRooms = current(state.rooms).slice(1);
      const existingPrivateRoom = privateRooms.find(room => (
        room.id === payload.id
      ));
      if (existingPrivateRoom) {
        state.activeRoom = existingPrivateRoom;
        state.messages = state.allMessages.filter(message => shouldShowMessage(message, existingPrivateRoom));
        return;
      }
      state.rooms = [...state.rooms, payload];
      state.activeRoom = payload;
      state.messages = state.allMessages.filter(message => shouldShowMessage(message, payload));

      localStorage.setItem(`${state.page}_private_rooms`, JSON.stringify([...privateRooms, payload]));
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
