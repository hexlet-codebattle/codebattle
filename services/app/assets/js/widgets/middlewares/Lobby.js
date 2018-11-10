import socket from '../../socket';
import {
  cancelGameLobby, fetchGameList, newGameLobby, updateGameLobby,
} from '../actions';

const channelName = 'lobby';
const channel = socket.channel(channelName);

export const fetchState = () => (dispatch) => {
  channel.join()
    .receive('ignore', () => console.log('Lobby channel: auth error'))
    .receive('error', () => console.log('Lobby channel: unable to join'))
    .receive('ok', ({ games }) => dispatch(fetchGameList({ games })));

  channel.on('new:game', ({ game }) => dispatch(newGameLobby({ game })));
  channel.on('update:game', ({ game }) => dispatch(updateGameLobby({ game })));
  channel.on('cancel:game', ({ game_id }) => dispatch(cancelGameLobby({ game_id })));
};
