import socket from '../../socket';
import {
  cancelGameLobby, fetchGameList, newGameLobby, updateGameLobby,
} from '../actions';

const channelName = 'lobby';
const channel = socket.channel(channelName);

// # TODO_NOW: add channel.push('game:cancel', { gameId } )

// # TODO_NOW: refactor me to initLobbyChannel
export const fetchState = () => (dispatch) => {
  channel.join()
    .receive('ignore', () => console.log('Lobby channel: auth error'))
    .receive('error', () => console.log('Lobby channel: unable to join'))
    .receive(
      'ok',
      ({ active_games: activeGames, completed_games: completedGames }) => dispatch(fetchGameList({ activeGames, completedGames })),
    );

  channel.on('game:new', ({ game }) => dispatch(newGameLobby({ game })));
  channel.on('game:update', ({ game }) => dispatch(updateGameLobby({ game })));
  channel.on('game:cancel', ({ game_id: gameId }) => dispatch(cancelGameLobby({ gameId })));
  channel.on(
    'game:game_over',
    ({ active_games: activeGames, completed_games: completedGames }) => dispatch(fetchGameList({ activeGames, completedGames })),
  );
};
