import Gon from 'gon';
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
  const getDispatchActionHandler = actionCreator => data => dispatch(actionCreator(data));

  channel.join().receive('ok', data => {
    const greetingMessage = getSystemMessage({
      text: `Joined channel: ${capitalize(page)}`,
      status: 'success',
    });
    const messages = [greetingMessage, ...data.messages];
    const updatedData = { ...data, page, messages };
    dispatch(actions.updateChatData(updatedData));
    dispatch(actions.updateChatChannelState(true));
  });

  channel.onError(() => dispatch(actions.updateChatChannelState(false)));

  const handleUserJoined = getDispatchActionHandler(actions.userJoinedChat);
  const handleUserLeft = getDispatchActionHandler(actions.userLeftChat);
  const handleNewMessage = getDispatchActionHandler(actions.newChatMessage);
  const handleUserbanned = getDispatchActionHandler(actions.banUserChat);

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
    .push(channelMethods.chatAddMsg, payload);
};

export const pushCommand = command => {
  channel
    .push(channelMethods.chatCommand, command);
};
