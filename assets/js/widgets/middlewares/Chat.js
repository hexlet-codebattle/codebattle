import socket from '../../socket';
import getVar from '../../lib/phxVariables';

const chatId = getVar('game_id');
const channelName = `chat:${chatId}`;
const channel = socket.channel(channelName);

channel.join()
  .receive('ignore', () => console.log('Chat channel: auth error'))
  .receive('error', () => console.log('Chat channel: unable to join'))
  .receive('ok', () => console.log('Joined to chat successfully'));

channel.on('user:joined', users => console.log(users));
