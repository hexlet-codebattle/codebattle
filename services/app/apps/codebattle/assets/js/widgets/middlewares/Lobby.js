import { camelizeKeys } from 'humps';
import some from 'lodash/some';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import { calculateExpireDate } from '../utils/chatRoom';

import Channel from './Channel';

const channel = new Channel();

export const fetchState = currentUserId => dispatch => {
  const channelName = 'lobby';
  channel.setupChannel(channelName);

  const camelizeKeysAndDispatch = actionCreator => data => dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', camelizeKeysAndDispatch(actions.initGameList));

  channel.onError(() => {
    dispatch(actions.updateLobbyChannelState(false));
  });

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

  const handleGameEditorLangChanged = data => {
    dispatch(actions.updateEditorLang(data));
  };

  const handleGameCheckStarted = data => {
    const { gameId, userId } = data;
    const payload = { gameId, userId, checkResult: { status: 'started' } };

    dispatch(actions.updateCheckResult(payload));
  };

  return channel
    .addListener(channelTopics.lobbyGameUpsertTopic, handleGameUpsert)
    .addListener(channelTopics.lobbyGameEditorLangChangedTopic, handleGameEditorLangChanged)
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
    .push(channelMethods.gameCancel, { gameId });
};

export const createGame = params => {
  channel
    .push(channelMethods.gameCreate, params);
};

export const createExperimentGame = params => {
  channel
    .push(channelMethods.experimentGameCreate, params)
    .receive('error', error => console.error(error));
};

export const createInvite = invite => {
  channel
    .push(channelMethods.gameCreateInvite, invite);
};

export const acceptInvite = invite => () => {
  channel
    .push(channelMethods.gameAcceptInvite, invite);
};

export const declineInvite = invite => () => {
  channel
    .push(channelMethods.gameDeclineInvite, invite);
};

export const cancelInvite = invite => () => {
  channel
    .push(channelMethods.gameCancelInvite, invite);
};
