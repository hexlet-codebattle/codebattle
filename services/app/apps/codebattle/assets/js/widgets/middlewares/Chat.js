import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import capitalize from 'lodash/capitalize';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import getChatName from '../utils/names';

import Channel from './Channel';

const isRecord = Gon.getAsset('is_record');

const channel = isRecord ? null : new Channel(getChatName('channel'));

export const pushCommandTypes = {
  cleanBanned: 'clead_banned',
};

const establishChat = () => dispatch => {
  const currentChannel = channel;
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  currentChannel.join().receive('ok', data => {
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

  currentChannel.onError(() => dispatch(actions.updateChatChannelState(false)));

  const handleUserJoined = camelizeKeysAndDispatch(actions.userJoinedChat);
  const handleUserLeft = camelizeKeysAndDispatch(actions.userLeftChat);
  const handleNewMessage = camelizeKeysAndDispatch(actions.newChatMessage);
  const handleUserbanned = camelizeKeysAndDispatch(actions.banUserChat);

  return currentChannel
    .addListener(channelTopics.chatUserJoinedTopic, handleUserJoined)
    .addListener(channelTopics.chatUserLeftTopic, handleUserLeft)
    .addListener(channelTopics.chatUserNewMsgTopic, handleNewMessage)
    .addListener(channelTopics.chatUserBannedTopic, handleUserbanned);
};

export const connectToChat = (useChat = true) => dispatch => {
  if (!isRecord && useChat) {
    const currentChannel = establishChat()(dispatch);

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
