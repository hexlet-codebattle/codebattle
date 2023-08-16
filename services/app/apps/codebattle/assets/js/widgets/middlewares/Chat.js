import Gon from 'gon';
import _ from 'lodash';
import { camelizeKeys, decamelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';
import getChatName from '../utils/names';
import { getSystemMessage } from '../utils/chat';

const isRecord = Gon.getAsset('is_record');

const channel = isRecord ? null : socket.channel(getChatName('channel'));

const establishChat = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', data => {
    const page = getChatName('page');
    const greetingMessage = getSystemMessage({
      text: `Joined channel: ${_.capitalize(page)}`,
      status: 'success',
    });
    const messages = [greetingMessage, ...data.messages];
    const updatedData = { ...data, page, messages };
    camelizeKeysAndDispatch(actions.updateChatData)(updatedData);
    dispatch(actions.updateChatChannelState(true));
  });

  channel.onError(() => dispatch(actions.updateChatChannelState(false)));

  const handleUserJoined = camelizeKeysAndDispatch(actions.userJoinedChat);
  const handleUserLeft = camelizeKeysAndDispatch(actions.userLeftChat);
  const handleNewMessage = camelizeKeysAndDispatch(actions.newChatMessage);
  const handleUserBaned = camelizeKeysAndDispatch(actions.banUserChat);

  const refs = [
    channel.on('chat:user_joined', handleUserJoined),
    channel.on('chat:user_left', handleUserLeft),
    channel.on('chat:new_msg', handleNewMessage),
    channel.on('chat:user_banned', handleUserBaned),
  ];

  const oldChannel = channel;

  const clearChatListeners = () => {
    if (oldChannel) {
      oldChannel.off('chat:user_joined', refs[0]);
      oldChannel.off('chat:user_left', refs[1]);
      oldChannel.off('chat:new_msg', refs[2]);
      oldChannel.off('chat:user_banned', refs[3]);
    }
  };

  return clearChatListeners;
};

export const connectToChat = () => dispatch => {
  if (!isRecord) {
    const clearChatConnection = establishChat()(dispatch);

    return clearChatConnection;
  }

  return () => {};
};

export const addMessage = payload => {
  channel
    .push('chat:add_msg', decamelizeKeys(payload, { separator: '_' }))
    .receive('error', error => console.error(error));
};

export const pushCommand = command => {
  channel
    .push('chat:command', command)
    .receive('error', error => console.error(error));
};
