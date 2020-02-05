import { camelizeKeys } from 'humps';
import socket from '../../socket';
import * as actions from '../actions';

const channelName = 'lobby';
const channel = socket.channel(channelName);

export const fetchState = () => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.on('game:upsert', camelizeKeysAndDispatch(actions.upsertGameLobby));
  channel.on('game:remove', camelizeKeysAndDispatch(actions.removeGameLobby));
  channel.on('game:finish', camelizeKeysAndDispatch(actions.finishGame));
};

export const cancelGame = gameId => () => {
  channel.push('game:cancel', { gameId }).receive('error', error => console.error(error));
};
