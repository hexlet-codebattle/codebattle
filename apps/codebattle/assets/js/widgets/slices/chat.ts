import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';

import defaultRooms from '../config/rooms';
import { isMessageForCurrentUser, isMessageForCurrentPrivateRoom } from '../utils/chat';
import { ttl, filterPrivateRooms } from '../utils/chatRoom';

export interface ChatMessage {
  id?: string | number;
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
  name?: string;
  [key: string]: unknown;
}

// Private rooms cache the target user's name at creation time (and in
// localStorage), so it goes stale when that user renames themselves. The chat
// presence list always carries the current name, so reconcile private-room
// names against it by targetUserId whenever the users list or rooms change.
const reconcileRoomNames = (rooms: ChatRoom[], activeRoom: ChatRoom, users: ChatUser[]) => {
  const nameById = new Map(users.map((user) => [user.id, user.name]));

  const applyName = (room: ChatRoom): ChatRoom => {
    if (room.targetUserId == null) {
      return room;
    }

    const currentName = nameById.get(room.targetUserId);
    return currentName && currentName !== room.name ? { ...room, name: currentName } : room;
  };

  return {
    rooms: rooms.map(applyName),
    activeRoom: applyName(activeRoom),
  };
};

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
    updateChatData: (state, { payload }: PayloadAction<Partial<ChatState>>) => {
      const next = { ...state, ...payload };

      if (payload.users) {
        const reconciled = reconcileRoomNames(next.rooms, next.activeRoom, next.users);
        next.rooms = reconciled.rooms;
        next.activeRoom = reconciled.activeRoom;
      }

      return next;
    },
    updateChatDataHistory: (state, { payload }: PayloadAction<ChatState['history']>) => ({
      ...state,
      history: {
        ...payload,
      },
    }),
    userJoinedChat: (state, { payload: { users } }: PayloadAction<{ users: ChatUser[] }>) => {
      state.users = users;
      const reconciled = reconcileRoomNames(state.rooms, state.activeRoom, users);
      state.rooms = reconciled.rooms;
      state.activeRoom = reconciled.activeRoom;
    },
    userLeftChat: (state, { payload: { users } }: PayloadAction<{ users: ChatUser[] }>) => {
      state.users = users;
      const reconciled = reconcileRoomNames(state.rooms, state.activeRoom, users);
      state.rooms = reconciled.rooms;
      state.activeRoom = reconciled.activeRoom;
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
    deleteChatMessage: (state, { payload }: PayloadAction<{ id: string | number }>) => {
      state.messages = state.messages.filter((message) => message.id !== payload.id);
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
      const rooms = [...state.rooms, ...payload];
      const reconciled = reconcileRoomNames(rooms, state.activeRoom, state.users);
      state.rooms = reconciled.rooms;
      state.activeRoom = reconciled.activeRoom;
    },
    updateChatChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.channel.online = payload;
    },
  },
});

const { actions, reducer } = chat;
export { actions };
export default reducer;
