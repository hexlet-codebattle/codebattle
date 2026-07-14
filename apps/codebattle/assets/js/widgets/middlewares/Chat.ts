import capitalize from 'lodash/capitalize';

import { getPageProp } from '@/inertia/pageProps';

import i18n from '../../i18n';
import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import getChatTopic from '../utils/names';

import Channel from './Channel';

const isRecord = getPageProp('is_record', false);

const channel = new Channel();

export const pushCommandTypes = {
  cleanBanned: 'clean_banned',
};

const establishChat = (page: string) => (dispatch: any) => {
  const getDispatchActionHandler = (actionCreator: any) => (data: any) =>
    dispatch(actionCreator(data));

  channel.join().receive('ok', (data: any) => {
    const greetingMessage = getSystemMessage({
      text: i18n.t('Joined channel: %{name}', { name: capitalize(page) }),
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

export const connectToChat =
  (useChat = true, chatPage = 'channel', chatId?: string | number) =>
  (dispatch: any) => {
    if (!isRecord && useChat) {
      const page = getChatTopic(chatPage, chatId);
      channel.setupChannel(page);
      const currentChannel = establishChat(page)(dispatch);

      return currentChannel;
    }

    return undefined;
  };

export const addMessage = (payload: any) => {
  channel.push(channelMethods.chatAddMsg, payload);
};

export const pushCommand = (command: any) => {
  channel.push(channelMethods.chatCommand, command);
};
