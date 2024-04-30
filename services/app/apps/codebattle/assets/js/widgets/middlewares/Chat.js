import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import capitalize from 'lodash/capitalize';

import socket, { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import getChatName from '../utils/names';

const isRecord = Gon.getAsset('is_record');

const channel = isRecord ? null : socket.channel(getChatName('channel'));

export const pushCommandTypes = {
  cleanBanned: 'clead_banned',
};

const establishChat = () => dispatch => {
  const oldChannel = channel;
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  oldChannel.join().receive('ok', data => {
    const page = getChatName('page');
    const greetingMessage = getSystemMessage({
      text: `Joined channel: ${capitalize(page)}`,
      status: 'success',
    });
    const messages = [greetingMessage, ...data.messages];
    const updatedData = { ...data, page, messages };
    camelizeKeysAndDispatch(actions.updateChatData)(updatedData);
    dispatch(actions.updateChatChannelState(true));
  });

  oldChannel.onError(() => dispatch(actions.updateChatChannelState(false)));

  const handleUserJoined = camelizeKeysAndDispatch(actions.userJoinedChat);
  const handleUserLeft = camelizeKeysAndDispatch(actions.userLeftChat);
  const handleNewMessage = camelizeKeysAndDispatch(actions.newChatMessage);
  const handleUserbanned = camelizeKeysAndDispatch(actions.banUserChat);

  const refs = [
    oldChannel.on(channelTopics.chatUserJoinedTopic, handleUserJoined),
    oldChannel.on(channelTopics.chatUserLeftTopic, handleUserLeft),
    oldChannel.on(channelTopics.chatUserNewMsgTopic, handleNewMessage),
    oldChannel.on(channelTopics.chatUserBannedTopic, handleUserbanned),
  ];

  const clearChatListeners = () => {
    if (oldChannel) {
      oldChannel.off(channelTopics.chatUserJoinedTopic, refs[0]);
      oldChannel.off(channelTopics.chatUserLeftTopic, refs[1]);
      oldChannel.off(channelTopics.chatUserNewMsgTopic, refs[2]);
      oldChannel.off(channelTopics.chatUserBannedTopic, refs[3]);
    }
  };

  return clearChatListeners;
};

export const connectToChat = (useChat = true) => dispatch => {
  if (!isRecord && useChat) {
    const clearChatConnection = establishChat()(dispatch);

    return clearChatConnection;
  }

  return () => {};
};

export const addMessage = payload => {
  channel
    .push(channelMethods.chatAddMsg, decamelizeKeys(payload, { separator: '_' }))
    .receive('error', error => console.error(error));
};

export const pushCommand = command => {
  channel
    .push(channelMethods.chatCommand, command)
    .receive('error', error => console.error(error));
};
