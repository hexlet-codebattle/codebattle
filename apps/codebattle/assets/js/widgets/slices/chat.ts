import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';

import defaultRooms from '../config/rooms';
import { isMessageForCurrentUser, isMessageForCurrentPrivateRoom } from '../utils/chat';
import { ttl, filterPrivateRooms } from '../utils/chatRoom';

export interface ChatMessage {
  name?: string;
  type?: string;
  userId?: number;
  meta?: { type?: string; targetUserId?: number; status?: string };
  [key: string]: unknown;
}

export interface ChatRoom {
  name: string;
  targetUserId?: number;
  expireTo?: number;
  required?: boolean;
  [key: string]: unknown;
}

export interface ChatUser {
  id: number;
  [key: string]: unknown;
}

export interface ChatState {
  users: ChatUser[];
  messages: ChatMessage[];
  page: string;
  activeRoom: ChatRoom;
  rooms: ChatRoom[];
  history: {
    users: ChatUser[];
    messages: ChatMessage[];
  };
  disabled: boolean;
  channel: { online: boolean };
}

const initialState: ChatState = {
  users: [],
  messages: [],
  page: 'lobby',
  activeRoom: defaultRooms.general,
  rooms: [defaultRooms.general, defaultRooms.system],
  history: {
    users: [],
    messages: [],
  },
  disabled: false,
  channel: { online: false },
};

const chat = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateChatData: (state, { payload }: PayloadAction<Partial<ChatState>>) => ({
      ...state,
      ...payload,
    }),
    updateChatDataHistory: (state, { payload }: PayloadAction<ChatState['history']>) => ({
      ...state,
      history: {
        ...payload,
      },
    }),
    userJoinedChat: (state, { payload: { users } }: PayloadAction<{ users: ChatUser[] }>) => {
      state.users = users;
    },
    userLeftChat: (state, { payload: { users } }: PayloadAction<{ users: ChatUser[] }>) => {
      state.users = users;
    },
    newChatMessage: (state, { payload }: PayloadAction<ChatMessage>) => {
      if (isMessageForCurrentUser(payload)) {
        state.rooms = state.rooms.map((room) =>
          isMessageForCurrentPrivateRoom(room, payload)
            ? { ...room, expireTo: (room.expireTo as number) + ttl }
            : room,
        );
      }

      state.messages = [...state.messages, payload];
    },
    banUserChat: (state, { payload }: PayloadAction<{ name: string }>) => {
      state.messages = [...state.messages.filter((message) => message.name !== payload.name)];
    },
    setActiveRoom: (state, { payload }: PayloadAction<ChatRoom>) => {
      state.activeRoom = payload;
    },
    createPrivateRoom: (state, { payload }: PayloadAction<ChatRoom>) => {
      const rooms = current(state.rooms);
      const privateRooms = filterPrivateRooms(rooms) as ChatRoom[];
      const existingPrivateRoom = privateRooms.find(
        (room: ChatRoom) => room.targetUserId === payload.targetUserId,
      );
      if (existingPrivateRoom) {
        state.activeRoom = existingPrivateRoom;
        return;
      }
      state.rooms = [...state.rooms, payload];
      state.activeRoom = payload;
    },
    setPrivateRooms: (state, { payload }: PayloadAction<ChatRoom[]>) => {
      state.rooms = [...state.rooms, ...payload];
    },
    updateChatChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.channel.online = payload;
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
