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
    .receive('ok', ({ active_games: activeGames, completed_games: completedGames }) => dispatch(fetchGameList({ activeGames, completedGames })));

  channel.on('new:game', ({ game }) => dispatch(newGameLobby({ game })));
  channel.on('update:game', ({ game }) => dispatch(updateGameLobby({ game })));
  channel.on('cancel:game', ({ game_id: gameId }) => dispatch(cancelGameLobby({ gameId })));
  channel.on('gave_over:game', ({ active_games: activeGames, completed_games: completedGames }) => dispatch(fetchGameList({ activeGames, completedGames })));
};
