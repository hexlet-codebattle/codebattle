import Gon from 'gon';
import { camelizeKeys } from 'humps';
import some from 'lodash/some';

import socket from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';

import { calculateExpireDate } from './Room';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = (currentUserId) => (dispatch) => {
  const camelizeKeysAndDispatch = (actionCreator) => (data) =>
    dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.onError(() => {
    dispatch(actions.updateLobbyChannelState(false));
  });

  const handleGameUpsert = (data) => {
    const newData = camelizeKeys(data);
    const {
      game: { id, players, state: gameState },
    } = newData;
    const currentPlayerId = currentUserId;
    const isGameStarted = gameState === 'playing';
    const isCurrentUserInGame = some(players, ({ id: playerId }) => playerId === currentPlayerId);

    if (isGameStarted && isCurrentUserInGame) {
      window.location.href = `/games/${id}`;
    } else {
      dispatch(actions.upsertGameLobby(newData));
    }
  };

  const handleGameCheckStarted = (data) => {
    const { gameId, userId } = camelizeKeys(data);
    const payload = { gameId, userId, checkResult: { status: 'started' } };

    dispatch(actions.updateCheckResult(payload));
  };

  const refs = [
    channel.on('game:upsert', handleGameUpsert),
    channel.on('game:check_started', handleGameCheckStarted),
    channel.on('game:check_completed', camelizeKeysAndDispatch(actions.updateCheckResult)),
    channel.on('game:remove', camelizeKeysAndDispatch(actions.removeGameLobby)),
    channel.on('game:finished', camelizeKeysAndDispatch(actions.finishGame)),
  ];

  const oldChannel = channel;

  const clearLobbyListeners = () => {
    if (oldChannel) {
      oldChannel.off('game:upsert', refs[0]);
      oldChannel.off('game:check_started', refs[1]);
      oldChannel.off('game:check_completed', refs[2]);
      oldChannel.off('game:remove', refs[3]);
      oldChannel.off('game:finished', refs[4]);
    }
  };

  return clearLobbyListeners;
};

export const openDirect = (userId, name) => (dispatch) => {
  const expireTo = calculateExpireDate();
  const roomData = {
    targetUserId: userId,
    name,
    expireTo,
  };

  const message = getSystemMessage({
    text: `You join private channel with ${name}. You can send personal message`,
  });

  dispatch(actions.newChatMessage(message));
  dispatch(actions.createPrivateRoom(roomData));
};

export const cancelGame = (gameId) => () => {
  channel
    .push('game:cancel', { game_id: gameId })
    .receive('error', (error) => console.error(error));
};

export const createGame = (params) => {
  channel.push('game:create', params).receive('error', (error) => console.error(error));
};

export const createInvite = (invite) => {
  channel.push('game:create_invite', invite).receive('error', (error) => console.error(error));
};

export const acceptInvite = (invite) => () => {
  channel.push('game:accept_invite', invite).receive('error', (error) => console.error(error));
};

export const declineInvite = (invite) => () => {
  channel.push('game:decline_invite', invite).receive('error', (error) => console.error(error));
};

export const cancelInvite = (invite) => () => {
  channel.push('game:cancel_invite', invite).receive('error', (error) => console.error(error));
};
