import Gon from 'gon';
import { camelizeKeys } from 'humps';
import socket from '../../socket';
import {
  userJoinedChat, userLeftChat, fetchChatData, newMessageChat,
} from '../actions';

const chatId = Gon.getAsset('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

export const fetchState = () => (dispatch) => {
  const camelizeKeysAndDispatch = (actionCreator) => (data) => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  channel.join()
    .receive('ok', camelizeKeysAndDispatch(fetchChatData));

  channel.on('user:joined', camelizeKeysAndDispatch(userJoinedChat));
  channel.on('user:left', camelizeKeysAndDispatch(userLeftChat));
  channel.on('new:message', camelizeKeysAndDispatch(newMessageChat));
};

export const addMessage = (user, message) => {
  const payload = { user, message };

  channel.push('new:message', payload)
    .receive('error', (error) => console.error(error));
};
