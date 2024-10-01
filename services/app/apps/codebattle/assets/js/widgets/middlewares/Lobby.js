import Gon from 'gon';
import { camelizeKeys } from 'humps';
import some from 'lodash/some';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import { calculateExpireDate } from '../utils/chatRoom';

import Channel from './Channel';

const channelName = 'lobby';
const isRecord = Gon.getAsset('is_record');
const channel = !isRecord ? new Channel(channelName) : null;

export const fetchState = currentUserId => dispatch => {
  const currentChannel = channel;
  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  currentChannel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  currentChannel.onError(() => {
    dispatch(actions.updateLobbyChannelState(false));
  });

  currentChannel.onMessage((_event, payload) => camelizeKeys(payload));

  const handleGameUpsert = data => {
    const {
      game: { players, id, state: gameState },
    } = data;
    const currentPlayerId = currentUserId;
    const isGameStarted = gameState === 'playing';
    const isCurrentUserInGame = some(
      players,
      ({ id: playerId }) => playerId === currentPlayerId,
    );

    if (isGameStarted && isCurrentUserInGame) {
      window.location.href = `/games/${id}`;
    } else {
      dispatch(actions.upsertGameLobby(data));
    }
  };

  const handleGameCheckStarted = data => {
    const { gameId, userId } = data;
    const payload = { gameId, userId, checkResult: { status: 'started' } };

    dispatch(actions.updateCheckResult(payload));
  };

  return currentChannel
    .addListener(channelTopics.lobbyGameUpsertTopic, handleGameUpsert)
    .addListener(channelTopics.lobbyGameCheckStartedTopic, handleGameCheckStarted)
    .addListener(
      channelTopics.lobbyGameCheckCompletedTopic,
      camelizeKeysAndDispatch(actions.updateCheckResult),
    )
    .addListener(
      channelTopics.lobbyGameRemoveTopic,
      camelizeKeysAndDispatch(actions.removeGameLobby),
    )
    .addListener(
      channelTopics.lobbyGameFinishedTopic,
      camelizeKeysAndDispatch(actions.finishGame),
    );
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
    .push(channelMethods.gameCancel, { gameId })
    .receive('error', error => console.error(error));
};

export const createGame = params => {
  channel
    .push(channelMethods.gameCreate, params)
    .receive('error', error => console.error(error));
};

export const createCssGame = params => {
  channel
    .push(channelMethods.cssGameCreate, params)
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
