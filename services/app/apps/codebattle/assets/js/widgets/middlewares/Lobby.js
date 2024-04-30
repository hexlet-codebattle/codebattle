import Gon from 'gon';
import { camelizeKeys } from 'humps';
import some from 'lodash/some';

import socket, { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import { calculateExpireDate } from '../utils/chatRoom';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? socket.channel(channelName) : null;

export const fetchState = currentUserId => dispatch => {
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.onError(() => {
    dispatch(actions.updateLobbyChannelState(false));
  });

  const handleGameUpsert = data => {
    const newData = camelizeKeys(data);
    const {
      game: { players, id, state: gameState },
    } = newData;
    const currentPlayerId = currentUserId;
    const isGameStarted = gameState === 'playing';
    const isCurrentUserInGame = some(
      players,
      ({ id: playerId }) => playerId === currentPlayerId,
    );

    if (isGameStarted && isCurrentUserInGame) {
      window.location.href = `/games/${id}`;
    } else {
      dispatch(actions.upsertGameLobby(newData));
    }
  };

  const handleGameCheckStarted = data => {
    const { gameId, userId } = camelizeKeys(data);
    const payload = { gameId, userId, checkResult: { status: 'started' } };

    dispatch(actions.updateCheckResult(payload));
  };

  const refs = [
    channel.on(channelTopics.lobbyGameUpsertTopic, handleGameUpsert),
    channel.on(channelTopics.lobbyGameCheckStartedTopic, handleGameCheckStarted),
    channel.on(
      channelTopics.lobbyGameCheckCompletedTopic,
      camelizeKeysAndDispatch(actions.updateCheckResult),
    ),
    channel.on(channelTopics.lobbyGameRemoveTopic, camelizeKeysAndDispatch(actions.removeGameLobby)),
    channel.on(channelTopics.lobbyGameFinishedTopic, camelizeKeysAndDispatch(actions.finishGame)),
  ];

  const oldChannel = channel;

  const clearLobbyListeners = () => {
    if (oldChannel) {
      oldChannel.off(channelTopics.lobbyGameUpsertTopic, refs[0]);
      oldChannel.off(channelTopics.lobbyGameCheckStartedTopic, refs[1]);
      oldChannel.off(channelTopics.lobbyGameCheckCompletedTopic, refs[2]);
      oldChannel.off(channelTopics.lobbyGameRemoveTopic, refs[3]);
      oldChannel.off(channelTopics.lobbyGameFinishedTopic, refs[4]);
    }
  };

  return clearLobbyListeners;
};

export const openDirect = (userId, name) => dispatch => {
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

export const cancelGame = gameId => () => {
  channel
    .push(channelMethods.gameCancel, { game_id: gameId })
    .receive('error', error => console.error(error));
};

export const createGame = params => {
  channel
    .push(channelMethods.gameCreate, params)
    .receive('error', error => console.error(error));
};

export const createInvite = invite => {
  channel
    .push(channelMethods.gameCreateInvite, invite)
    .receive('error', error => console.error(error));
};

export const acceptInvite = invite => () => {
  channel
    .push(channelMethods.gameAcceptInvite, invite)
    .receive('error', error => console.error(error));
};

export const declineInvite = invite => () => {
  channel
    .push(channelMethods.gameDeclineInvite, invite)
    .receive('error', error => console.error(error));
};

export const cancelInvite = invite => () => {
  channel
    .push(channelMethods.gameCancelInvite, invite)
    .receive('error', error => console.error(error));
};
