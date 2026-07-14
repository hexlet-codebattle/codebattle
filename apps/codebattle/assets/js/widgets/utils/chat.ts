import { getPageProp } from '@/inertia/pageProps';

import messageTypes from '../config/messageTypes';
import rooms from '../config/rooms';

const currentUserId = getPageProp<{ id?: number }>('current_user', {})?.id;

interface ChatMessageMeta {
  type?: string;
  targetUserId?: number;
  status?: string;
}

interface ChatMessage {
  type?: string;
  userId?: number;
  meta?: ChatMessageMeta;
}

interface ChatRoom {
  name: string;
  targetUserId?: number;
}

export const isGeneralRoom = (room: ChatRoom) => room.name === rooms.general.name;

export const isPrivateRoom = (room: ChatRoom) =>
  !Object.values(rooms).some((r) => r.name === room.name);

export const isPrivateMessage = (messageType: string) => messageType === messageTypes.private;

export const isSystemMessage = (messageType: string | undefined) =>
  messageType === messageTypes.system;

export const isMessageForCurrentPrivateRoom = (room: ChatRoom, message: ChatMessage) =>
  room.targetUserId === message.meta?.targetUserId || room.targetUserId === message.userId;

export const isMessageForCurrentUser = (message: ChatMessage) =>
  message.meta?.type === messageTypes.private &&
  (message.userId === currentUserId || message.meta.targetUserId === currentUserId);

export const isMessageForEveryone = (message: ChatMessage) =>
  !message.meta || message.meta.type === messageTypes.general;

const isProperPrivateRoomActive = (message: ChatMessage, room: ChatRoom) =>
  (room.targetUserId === message.meta!.targetUserId && message.userId === currentUserId) ||
  (room.targetUserId === message.userId && message.meta!.targetUserId === currentUserId);

export const shouldShowMessage = (message: ChatMessage, room: ChatRoom) => {
  if (isSystemMessage(message.type)) {
    return true;
  }

  if (message.meta?.type === messageTypes.private) {
    return isProperPrivateRoomActive(message, room) || isGeneralRoom(room);
  }

  switch (room.name) {
    case rooms.general.name: {
      return true;
    }

    case rooms.system.name: {
      return message.type === messageTypes.system;
    }

    default:
      return !isPrivateRoom(room);
  }
};

interface SystemMessageParams {
  type?: string;
  text?: string;
  status?: string;
  userId?: number;
  name?: string;
  time?: string | number;
}

export const getSystemMessage = ({
  type = messageTypes.system,
  text = '',
  status = 'event',
  userId,
  name,
  time,
}: SystemMessageParams) => ({
  id: new Date().getTime(),
  type,
  text,
  userId,
  name,
  time,
  meta: {
    status,
  },
});
