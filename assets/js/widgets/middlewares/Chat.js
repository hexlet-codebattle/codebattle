import socket from '../../socket';
import getVar from '../../lib/phxVariables';
import { currentUserIdSelector } from '../redux/UserRedux';
import { userJoinedChat, userLeftChat, fetchChatData, newMessageChat } from '../actions'

const chatId = getVar('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

export const fetchState = () => (dispatch) => {
  channel.join()
    .receive('ignore', () => console.log('Chat channel: auth error'))
    .receive('error', () => console.log('Chat channel: unable to join'))
    .receive('ok', ({ users, msgs }) => dispatch(fetchChatData({ users, messages: msgs })));

  channel.on('user:joined', ({ users }) => dispatch(userJoinedChat({ users })));
  channel.on('user:left', ({ users }) => dispatch(userLeftChat({ users })));
  channel.on('new:message', ({ message }) => {
    console.log(message);
    dispatch(newMessageChat({ message }))
  });
};

export const addMessage = (user, message) => (dispatch) => {
  const payload = { text: message };

  dispatch(newMessageChat({ user, message }));
  channel.push('new:message', payload)
    .receive('ok', response => {
      console.log('new message added');
    })
    .receive('error', error => {
      console.error(error);
    });
};
