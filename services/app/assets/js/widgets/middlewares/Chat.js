import Gon from 'gon';
import socket from '../../socket';
import {
  userJoinedChat, userLeftChat, fetchChatData, newMessageChat,
} from '../actions';

const chatId = Gon.getAsset('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

export const fetchState = () => (dispatch) => {
  channel.join()
    .receive('ignore', () => console.log('Chat channel: auth error'))
    .receive('error', () => console.log('Chat channel: unable to join'))
    .receive('ok', ({ users, messages }) => dispatch(fetchChatData({ users, messages })));

  channel.on('user:joined', ({ users }) => dispatch(userJoinedChat({ users })));
  channel.on('user:left', ({ users }) => dispatch(userLeftChat({ users })));
  channel.on('new:message', ({ user, message }) => {
    dispatch(newMessageChat({ user, message }));
  });
};

export const addMessage = (user, message) => {
  const payload = { user, message };

  channel.push('new:message', payload)
    .receive('error', error => console.error(error));
};
