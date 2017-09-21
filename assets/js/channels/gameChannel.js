import socket from './socket';
import getVar from '../lib/phxVariables';

const gameId = getVar('game_id');
const channelName = `game:${gameId}`;
const channel = socket.channel(channelName);


channel.join().receive('ignore', () => console.log('Game channel: auth error'))
              .receive('error', () => { console.log('Game channel: unable to join'); })
              .receive('ok', () => console.log('Game channel: join ok'))

channel.onError(ev => console.log('Game channel: something went wrong', ev));
channel.onClose(ev => console.log('Game channel: closed', ev));

export default channel;
