import { camelizeKeys } from 'humps';
import some from 'lodash/some';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';
import { getSystemMessage } from '../utils/chat';
import { calculateExpireDate } from '../utils/chatRoom';

import Channel from './Channel';

const channel = new Channel();

export const findCurrentUserPlayingGame = (games: any[] = [], currentUserId: number) =>
  games.find(
    (game: any) =>
      game.state === 'playing' &&
      some(game.players, ({ id: playerId }: { id: number }) => playerId === currentUserId),
  );

export const fetchState = (currentUserId: number, waitingGameId?: number) => (dispatch: any) => {
  const channelName = 'lobby';
  channel.setupChannel(channelName);

  const camelizeKeysAndDispatch = (actionCreator: any) => (data: any) =>
    dispatch(actionCreator(camelizeKeys(data)));

  channel.join().receive('ok', (data: any) => {
    const normalizedData = camelizeKeys(data);
    dispatch(actions.initGameList(normalizedData));

    const activeGame = findCurrentUserPlayingGame(normalizedData.activeGames, currentUserId);
    if (activeGame && activeGame.id === waitingGameId) {
      window.location.replace(`/games/${activeGame.id}`);
    }
  });

  channel.onError(() => {
    dispatch(actions.updateLobbyChannelState(false));
  });

  const handleGameUpsert = (data: any) => {
    const normalizedData = camelizeKeys(data);
    const {
      game: { players, id, state: gameState },
    } = normalizedData;
    const currentPlayerId = currentUserId;
    const isGameStarted = gameState === 'playing';
    const isCurrentUserInGame = some(
      players,
      ({ id: playerId }: { id: number }) => playerId === currentPlayerId,
    );

    if (isGameStarted && isCurrentUserInGame) {
      window.location.replace(`/games/${id}`);
    } else {
      dispatch(actions.upsertGameLobby(normalizedData));
    }
  };

  const handleGameEditorLangChanged = (data: any) => {
    dispatch(actions.updateEditorLang(data));
  };

  const handleGameCheckStarted = (data: any) => {
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
    .addListener(channelTopics.lobbyGameFinishedTopic, camelizeKeysAndDispatch(actions.finishGame));
};

export const openDirect = (userId: number, name: string) => (dispatch: any) => {
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

export const cancelGame = (gameId: number) => () => {
  channel.push(channelMethods.gameCancel, { gameId });
};

export const createGame = (params: any) => {
  channel.push(channelMethods.gameCreate, params);
};

export const createExperimentGame = (params: any) => {
  channel
    .push(channelMethods.experimentGameCreate, params)
    .receive('error', (error: any) => console.error(error));
};

export const createInvite = (invite: any) => {
  channel.push(channelMethods.gameCreateInvite, invite);
};

export const acceptInvite = (invite: any) => () => {
  channel.push(channelMethods.gameAcceptInvite, invite);
};

export const declineInvite = (invite: any) => () => {
  channel.push(channelMethods.gameDeclineInvite, invite);
};

export const cancelInvite = (invite: any) => () => {
  channel.push(channelMethods.gameCancelInvite, invite);
};
