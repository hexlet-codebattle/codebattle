import socket from '../../socket';
import getVar from '../../lib/phxVariables';

const chatId = getVar('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

export const initChatChannel = () => {
  channel.join()
    .receive('ignore', () => console.log('Chat channel: auth error'))
    .receive('error', () => console.log('Chat channel: unable to join'))
    .receive('ok', response => console.log(response));
};

export const chatReady = (dispatch) => {
  initChatChannel();
  channel.on('user:joined', users => console.log(users));
};
