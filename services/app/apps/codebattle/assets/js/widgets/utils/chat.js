import Gon from 'gon';

import messageTypes from '../config/messageTypes';
import rooms from '../config/rooms';

const currentUserId = Gon.getAsset('current_user').id;

export const isGeneralRoom = room => room.name === rooms.general.name;

export const isPrivateRoom = room => !Object.values(rooms).some(r => r.name === room.name);

export const isPrivateMessage = messageType => messageType === messageTypes.private;

export const isSystemMessage = messageType => messageType === messageTypes.system;

export const isMessageForCurrentPrivateRoom = (room, message) => (
  room.targetUserId === message.meta?.targetUserId || room.targetUserId === message.userId
);

export const isMessageForCurrentUser = message => (
  message.meta?.type === messageTypes.private
  && (message.userId === currentUserId || message.meta.targetUserId === currentUserId)
);

export const isMessageForEveryone = message => !message.meta || message.meta.type === messageTypes.general;

const isProperPrivateRoomActive = (message, room) => (
  (room.targetUserId === message.meta.targetUserId && message.userId === currentUserId)
  || (room.targetUserId === message.userId && message.meta.targetUserId === currentUserId)
);

export const shouldShowMessage = (message, room) => {
  if (isSystemMessage(message.type)) {
    return true;
  }

  if (message.meta?.type === messageTypes.private) {
    return isProperPrivateRoomActive(message, room) || isGeneralRoom(room);
  }

  switch (room.name) {
    case (rooms.general.name): {
      return true;
    }

    case (rooms.system.name): {
      return message.type === messageTypes.system;
    }

    default:
      return !isPrivateRoom(room);
  }
};

export const getSystemMessage = ({
  type = messageTypes.system,
  text = '',
  status = 'event',
  userId,
  name,
  time,
}) => ({
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
