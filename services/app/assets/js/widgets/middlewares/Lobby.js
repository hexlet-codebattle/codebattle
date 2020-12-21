import { camelizeKeys } from 'humps';
import Gon from 'gon';
import socket from '../../socket';
import { actions } from '../slices';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = () => (dispatch, getState) => {
  const camelizeKeysAndDispatch = actionCreator => data => (
    dispatch(actionCreator(camelizeKeys(data)))
  );

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.on('game:upsert', data => {
    const { game: { players, id, state: gameStatus } } = data;
    const isRedirecting = () => {
      if (!gameStatus === 'playing') {
        return false;
      }
      if (players.length < 2) {
        return false;
      }
      const currentGamePlayersIds = players.map(player => player.id);
      const currentPlayerId = getState().user.currentUserId;
      if (!currentGamePlayersIds.includes(currentPlayerId)) {
        return false;
      }
      return true;
    };
    const redirectToGame = isRedirecting();
    if (redirectToGame) {
      window.location.href = `/games/${id}`;
    } else {
      dispatch(actions.upsertGameLobby(camelizeKeys(data)));
    }
  });

  channel.on('game:remove', camelizeKeysAndDispatch(actions.removeGameLobby));
  channel.on('game:finish', camelizeKeysAndDispatch(actions.finishGame));
};

export const cancelGame = gameId => () => {
  channel.push('game:cancel', { gameId }).receive('error', error => console.error(error));
};

export const createGame = params => {
  channel.push('game:create', params).receive('error', error => console.error(error));
};
