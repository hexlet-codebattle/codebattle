import socket from '../../socket';
import getVar from '../../lib/phxVariables';

const gameId = getVar('game_id');
const channelName = `game:${gameId}`;
const channel = socket.channel(channelName);

channel.join()
    .receive('ok', (resp) => { console.log('Joined successfully', resp); })
    .receive('error', (resp) => { console.log('Unable to join', resp); });


export const sendEditorData = (data) => {
  return (dispatch) => {
    channel.push('editor:data', { data })
  };
}
