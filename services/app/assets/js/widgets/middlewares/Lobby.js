import { camelizeKeys } from 'humps';
import Gon from 'gon';
import socket from '../../socket';
import * as actions from '../actions';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.on('game:new', camelizeKeysAndDispatch(actions.newGameLobby));
  channel.on('game:update', camelizeKeysAndDispatch(actions.updateGameLobby));
  channel.on('game:cancel', camelizeKeysAndDispatch(actions.cancelGameLobby));
  channel.on('game:game_over', camelizeKeysAndDispatch(actions.fetchGameList));
};

export const cancelGame = gameId => () => {
  channel.push('game:cancel', { gameId }).receive('error', error => console.error(error));
};
