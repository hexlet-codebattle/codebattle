import { createSlice, current } from '@reduxjs/toolkit';

import rooms from '../config/rooms';
import {
  getMessagesForCurrentUser,
  isMessageForCurrentUser,
  isMessageForEveryone,
  shouldShowMessage,
} from '../utils/chat';

const getPrivateRooms = page => {
  const storedPrivateRooms = JSON.parse(localStorage.getItem(`${page}_private_rooms`));

  return storedPrivateRooms || [];
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
    updateChatData: (state, { payload }) => {
      const messages = getMessagesForCurrentUser(payload.messages);

      return {
        ...state,
        ...payload,
        rooms: [...state.rooms, ...getPrivateRooms(payload.page)],
        allMessages: messages,
        messages,
      };
    },
    updateChatDataHistory: (state, { payload }) => {
      const messages = getMessagesForCurrentUser(payload.messages);

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
    newMessageChat: (state, { payload }) => {
      if (isMessageForCurrentUser(payload) || isMessageForEveryone(payload)) {
        if (shouldShowMessage(payload, state.activeRoom)) {
          state.messages = [...state.messages, payload];
        }
        state.allMessages = [...state.allMessages, payload];
      }
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
