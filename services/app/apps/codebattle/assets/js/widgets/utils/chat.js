import Gon from 'gon';

import messageTypes from '../config/messageTypes';
import rooms from '../config/rooms';
// import { store } from '../App';  Dependency cycle

const currentUser = Gon.getAsset('current_user');

export const isGeneralRoom = room => room.name === rooms.general.name;

export const isPrivateMessage = messageType => messageType === messageTypes.private;

export const isMessageForCurrentPrivateRoom = (room, message) => (
  room.targetUserId === message.meta?.targetUserId || room.targetUserId === message.userId
);

export const isMessageForCurrentUser = message => (
  message.meta?.type === messageTypes.private
  && (message.userId === currentUser.id || message.meta.targetUserId === currentUser.id)
);

export const isMessageForEveryone = message => !message.meta || message.meta.type === messageTypes.general;

const isProperPrivateRoomActive = (message, room) => (
  (room.targetUserId === message.meta.targetUserId && message.userId === currentUser.id)
  || (room.targetUserId === message.userId && message.meta.targetUserId === currentUser.id)
);

export const shouldShowMessage = (message, room) => {
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
      return true;
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
