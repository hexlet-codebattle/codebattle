import Gon from 'gon';

import messageTypes from '../config/messageTypes';
// import { store } from '../App';  Dependency cycle

const currentUser = Gon.getAsset('current_user');

export const isGeneralRoomActive = room => room.id === null;

export const isPrivateMessage = messageType => messageType === messageTypes.private;

export const isMessageForCurrentRoom = (room, message) => room.id === message.meta?.userId || room.id === message.userId;

export const isMessageForCurrentUser = message => (
  message.meta?.type === messageTypes.private
  && (message.userId === currentUser.id || message.meta.userId === currentUser.id)
);

export const isMessageForEveryone = message => !message.meta || message.meta.type === messageTypes.general;

const isProperPrivateRoomActive = (message, room) => (
  (room.id === message.meta.userId && message.userId === currentUser.id)
  || (room.id === message.userId && message.meta.userId === currentUser.id)
);

export const shouldShowMessage = (message, room) => {
  switch (message.meta?.type) {
    case messageTypes.private:
      return isProperPrivateRoomActive(message, room) || isGeneralRoomActive(room);
    default:
      return isGeneralRoomActive(room);
  }
};

export const getMessagesForCurrentUser = messages => messages.filter(message => {
  if (isMessageForCurrentUser(message) || isMessageForEveryone(message)) {
    return true;
  }
  return false;
});
