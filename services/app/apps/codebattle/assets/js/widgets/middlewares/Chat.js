import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import capitalize from 'lodash/capitalize';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import getChatTopic from '../utils/names';

import Channel from './Channel';

const isRecord = Gon.getAsset('is_record');

const channel = new Channel();

export const pushCommandTypes = {
  cleanBanned: 'clead_banned',
};

const establishChat = page => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', data => {
    const greetingMessage = getSystemMessage({
      text: `Joined channel: ${capitalize(page)}`,
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
  const handleUserbanned = camelizeKeysAndDispatch(actions.banUserChat);

  return channel
    .addListener(channelTopics.chatUserJoinedTopic, handleUserJoined)
    .addListener(channelTopics.chatUserLeftTopic, handleUserLeft)
    .addListener(channelTopics.chatUserNewMsgTopic, handleNewMessage)
    .addListener(channelTopics.chatUserBannedTopic, handleUserbanned);
};

export const connectToChat = (useChat = true, chatPage = 'channel', chatId) => dispatch => {
  if (!isRecord && useChat) {
    const page = getChatTopic(chatPage, chatId);
    channel.setupChannel(page);
    const currentChannel = establishChat(page)(dispatch);

    return currentChannel;
  }

  return undefined;
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
