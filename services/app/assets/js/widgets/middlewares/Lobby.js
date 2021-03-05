import { camelizeKeys } from 'humps';
import Gon from 'gon';
import _ from 'lodash';

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
    const currentPlayerId = getState().user.currentUserId;
    const isGameStarted = gameStatus === 'playing';
    const isCurrentUserInGame = _.some(players, ({ id: playerId }) => playerId === currentPlayerId);

    if (isGameStarted && isCurrentUserInGame) {
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

export const createInvite = invite => {
  channel.push('game:create_invite', invite).receive('error', error => console.error(error));
};

export const acceptInvite = invite => () => {
  channel.push('game:accept_invite', invite).receive('error', error => console.error(error));
};

export const declineInvite = invite => () => {
  channel.push('game:decline_invite', invite).receive('error', error => console.error(error));
};

export const cancelInvite = invite => () => {
  channel.push('game:cancel_invite', invite).receive('error', error => console.error(error));
};
