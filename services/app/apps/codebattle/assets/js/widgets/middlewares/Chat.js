import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';
import {
  normalizeDataForActiveChat,
  addMessageRoomNameForActiveChat,
  isMessageForCurrentUser,
  isMessageForEveryone,
} from '../utils/chat';

const chatId = Gon.getAsset('game_id');
const isRecord = Gon.getAsset('is_record');
const tournamentId = Gon.getAsset('tournament_id');

const prefixes = {
  page: {
    lobby: 'lobby',
    tournament: 'tournament',
    game: 'game',
  },
  channel: {
    lobby: 'chat:lobby',
    tournament: 'chat:t',
    game: 'chat:g',
  },
};

const getName = entityName => {
  if (tournamentId) {
    return `${prefixes[entityName].tournament}_${tournamentId}`;
  }
  if (chatId) {
    return `${prefixes[entityName].game}_${chatId}`;
  }

  return prefixes[entityName].lobby;
};

const channel = isRecord ? null : socket.channel(getName('channel'));

const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', async data => {
    const normalizedData = await normalizeDataForActiveChat(data);
    dispatch(actions.updateChatData({ ...normalizedData, page: getName('page') }));
  });

  channel.on(
    'chat:user_joined',
    camelizeKeysAndDispatch(actions.userJoinedChat),
  );
  channel.on('chat:user_left', camelizeKeysAndDispatch(actions.userLeftChat));
  channel.on('chat:new_msg', async data => {
    const message = camelizeKeys(data);
    if (isMessageForCurrentUser(message) || isMessageForEveryone(message)) {
      const updatedMessage = await addMessageRoomNameForActiveChat(message, []);
      dispatch(actions.newMessageChat(updatedMessage));
    }
  });
  channel.on('chat:user_banned', camelizeKeysAndDispatch(actions.banUserChat));
};

export const connectToChat = () => dispatch => {
  if (!isRecord) {
    dispatch(fetchState());
  }
};

export const addMessage = payload => {
  channel
    .push('chat:add_msg', payload)
    .receive('error', error => console.error(error));
};

export const pushCommand = command => {
  channel
    .push('chat:command', command)
    .receive('error', error => console.error(error));
};
