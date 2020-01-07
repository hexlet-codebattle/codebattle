import { camelizeKeys } from 'humps';
import socket from '../../socket';
import {
  cancelGameLobby, initGameList, newGameLobby, updateGameLobby,
} from '../actions';

const channelName = 'lobby';
const channel = socket.channel(channelName);

export const fetchState = () => (dispatch) => {
  channel.join().receive('ok', (data) => dispatch(initGameList(camelizeKeys(data))));

  channel.on('game:new', (data) => dispatch(newGameLobby(camelizeKeys(data))));
  channel.on('game:update', ({ game }) => dispatch(updateGameLobby(camelizeKeys(game))));
  channel.on('game:cancel', ({ game_id: gameId }) => dispatch(cancelGameLobby({ gameId })));
  channel.on('game:game_over', (data) => dispatch(camelizeKeys(data)));
};

export const cancelGame = (gameId) => () => {
  channel.push('game:cancel', { gameId }).receive('error', (error) => console.error(error));
};
