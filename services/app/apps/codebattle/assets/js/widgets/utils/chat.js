import Gon from 'gon';
import { camelizeKeys } from 'humps';
import axios from 'axios';

import messageTypes from '../config/messageTypes';
import rooms from '../config/rooms';
// import { store } from '../App';  Dependency cycle

const currentUser = Gon.getAsset('current_user');

export const isGeneralRoomActive = room => room.id === null;

export const isPrivateMessage = messageType => messageType === messageTypes.private;

export const isMessageForCurrentUser = message => (
  message.meta?.type === messageTypes.private
  && (message.userId === currentUser.id || message.meta.userId === currentUser.id)
);

export const isMessageForEveryone = message => !message.meta || message.meta.type === messageTypes.general;

export const addMessageRoomNameForActiveChat = async (message, users) => {
  if (message.meta?.type === messageTypes.private) {
    const oppositeParticipantId = message.userId === currentUser.id
      ? message.meta.userId
      : message.userId;
    // const state = store.getState();

    const oppositeParticipant = users.find(user => user.id === oppositeParticipantId)
      || await axios.get(`/api/v1/users/${oppositeParticipantId}`)
          .then(response => camelizeKeys(response.data.user))
          .catch(error => {
            console.error(error);
            return { name: 'No Room. Please, reload' };
          });

    return { ...message, roomName: oppositeParticipant.name };
  }

  return { ...message, roomName: rooms.general.name };
};

const filterMessage = message => {
  if (isMessageForCurrentUser(message) || isMessageForEveryone(message)) {
    return true;
  }
  return false;
};

export const normalizeDataForActiveChat = async data => {
  const { messages, users } = camelizeKeys(data);
  const promises = messages
    .filter(filterMessage)
    .map(message => addMessageRoomNameForActiveChat(message, users));
  const normalizedMessages = await Promise.all(promises);
  return { messages: normalizedMessages, users };
};

const addMessageRoomName = (message, users) => {
  if (message.meta?.type === messageTypes.private) {
    const oppositeParticipantId = message.userId === currentUser.id
      ? message.meta.userId
      : message.userId;

    const oppositeParticipant = users.find(user => user.id === oppositeParticipantId);

    return { ...message, roomName: oppositeParticipant.name };
  }

  return { ...message, roomName: rooms.general.name };
};

export const normalizeDataForPlaybookChat = data => {
  const { messages, users } = camelizeKeys(data);
  const normalizedMessages = messages
    .filter(filterMessage)
    .map(message => addMessageRoomName(message, camelizeKeys(users)));
  return { messages: normalizedMessages, users };
};
