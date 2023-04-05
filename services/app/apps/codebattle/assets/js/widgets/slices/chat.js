import { createSlice, current } from '@reduxjs/toolkit';
import Gon from 'gon';

import messageTypes from '../config/messageTypes';

const currentUser = Gon.getAsset('current_user');

const getPrivateRooms = page => {
  const storedPrivateRooms = JSON.parse(localStorage.getItem(`${page}_private_rooms`));

  return storedPrivateRooms || [];
};

const generalRoom = { name: 'General', id: null, meta: 'general' };

const isMessageForCurrentUser = message => (
  message.meta === messageTypes.private
  && (message.room.members.find(u => u.userId === currentUser.id))
);

const isMessageForEveryone = message => !message.meta || message.meta === messageTypes.general;

const addMessageRoomName = message => {
  if (message.meta === messageTypes.private) {
    const oppositeParticipant = message.room.members.find(user => user.userId !== currentUser.id);
    const updatedPrivateRoom = { ...message.room, name: oppositeParticipant.name };
    return { ...message, room: updatedPrivateRoom };
  }
  return { ...message, room: generalRoom };
};

const shouldShowMessage = (message, room) => {
  switch (message.meta) {
    case messageTypes.private:
      return room.id === message.room.id || room.meta === 'general';
    case messageTypes.general:
      return room.id === message.room.id;
    default:
      return false;
  }
};

const initialState = {
  users: [],
  messages: [],
  page: 'lobby',
  allMessages: [],
  activeRoom: generalRoom,
  rooms: [generalRoom],
  history: {
    users: [],
    messages: [],
  },
};

// meta general private tournament

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateChatData: (state, { payload }) => {
      const messages = payload.messages.filter(message => {
        if (isMessageForCurrentUser(message) || isMessageForEveryone(message)) {
          return true;
        }
        return false;
      })
      .map(message => addMessageRoomName(message));

      return {
        ...state,
        ...payload,
        rooms: [...state.rooms, ...getPrivateRooms(payload.page)],
        messages,
        allMessages: messages,
      };
    },
    updateChatDataHistory: (state, { payload }) => {
      const messages = payload.messages.map(message => addMessageRoomName(message));

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
      const updatedMessage = addMessageRoomName(payload);
      if (isMessageForCurrentUser(payload) || isMessageForEveryone(payload)) {
        if (shouldShowMessage(updatedMessage, state.activeRoom)) {
          state.messages = [...state.messages, updatedMessage];
        }
        state.allMessages = [...state.allMessages, updatedMessage];
      }
    },
    banUserChat: (state, { payload }) => {
      state.messages = [
        ...state.messages.filter(message => message.name !== payload.name),
      ];
    },
    setActiveRoom: (state, { payload }) => {
      state.activeRoom = payload;
      state.messages = payload.meta === 'general'
        ? state.allMessages
        : state.allMessages.filter(m => m.room.id === payload.id);
    },
    createPrivateRoom: (state, { payload }) => {
      const privateRooms = current(state.rooms).slice(1);
      const existingPrivateRoom = privateRooms.find(room => (
        room.id === payload.id
      ));
      if (existingPrivateRoom) {
        state.activeRoom = existingPrivateRoom;
        state.messages = state.allMessages.filter(m => m.room.id === existingPrivateRoom.id);
        return;
      }
      state.rooms = [...state.rooms, payload];
      state.activeRoom = payload;
      state.messages = state.allMessages.filter(m => m.room.id === payload.id);

      localStorage.setItem(`${state.page}_private_rooms`, JSON.stringify([...privateRooms, payload]));
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
