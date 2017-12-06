import socket from '../../socket';
import getVar from '../../lib/phxVariables';
import { userJoinedChat, userLeftChat, fetchChatData, newMessageChat } from '../actions'

const chatId = getVar('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

export default () => (dispatch) => {
  channel.join()
    .receive('ignore', () => console.log('Chat channel: auth error'))
    .receive('error', () => console.log('Chat channel: unable to join'))
    .receive('ok', ({ users, msgs }) => dispatch(fetchChatData({ users, messages: msgs })));

  channel.on('user:joined', ({ users }) => dispatch(userJoinedChat({ users })));
  channel.on('user:left', ({ users }) => dispatch(userLeftChat({ users })));
  channel.on('new:message', ({ message }) => dispatch(newMessageChat({ message })));
};
