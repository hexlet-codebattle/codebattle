import { makeGameUrl } from '@/utils/urlBuilders';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';

let channel = null;

export const addWaitingRoomListeners = (
  currentChannel,
  waitingRoomMachine,
  { cancelRedirect = false },
) => dispatch => {
  channel = currentChannel;

  const handleWaitingRoomStarted = response => {
    waitingRoomMachine.send(channelTopics.waitingRoomStartedTopic, {
      payload: response,
    });

    dispatch(actions.setActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomEnded = response => {
    waitingRoomMachine.send(channelTopics.waitingRoomEndedTopic, {
      payload: response,
    });

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerBanned = response => {
    waitingRoomMachine.send(channelTopics.waitingRoomPlayerBannedTopic, {
      payload: response,
    });

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerUnbanned = response => {
    waitingRoomMachine.send(channelTopics.waitingRoomPlayerUnbannedTopic, {
      payload: response,
    });

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerMatchmakingStarted = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
      { payload: response },
    );

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerMatchmakingResumed = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
      { payload: response },
    );

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerMatchmakingStopped = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
      { payload: response },
    );

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerMatchmakingPaused = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
      { payload: response },
    );

    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
  };

  const handleWaitingRoomPlayerMatchCreated = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchCreatedTopic,
      { payload: response },
    );

    dispatch(actions.updateTournamentMatches([response.match]));
    dispatch(actions.updateTournamentPlayers(response.players));
    dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    if (!cancelRedirect) {
      setTimeout(() => {
        window.location.replace(makeGameUrl(response.match.gameId));
      }, 10);
    }
  };

  return currentChannel
    .addListener(
      channelTopics.waitingRoomStartedTopic,
      handleWaitingRoomStarted,
    )
    .addListener(channelTopics.waitingRoomEndedTopic, handleWaitingRoomEnded)
    .addListener(
      channelTopics.waitingRoomPlayerBannedTopic,
      handleWaitingRoomPlayerBanned,
    )
    .addListener(
      channelTopics.waitingRoomPlayerUnbannedTopic,
      handleWaitingRoomPlayerUnbanned,
    )
    .addListener(
      channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
      handleWaitingRoomPlayerMatchmakingStarted,
    )
    .addListener(
      channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
      handleWaitingRoomPlayerMatchmakingResumed,
    )
    .addListener(
      channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
      handleWaitingRoomPlayerMatchmakingStopped,
    )
    .addListener(
      channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
      handleWaitingRoomPlayerMatchmakingPaused,
    )
    .addListener(
      channelTopics.waitingRoomPlayerMatchCreatedTopic,
      handleWaitingRoomPlayerMatchCreated,
    );
};

export const pauseWaitingRoomMatchmaking = () => () => {
  channel
    .push(channelMethods.matchmakingPause, {});
};

export const startWaitingRoomMatchmaking = () => () => {
  channel
    .push(channelMethods.matchmakingResume, {});
};

export const restartWaitingRoomMatchmaking = () => () => {
  channel
    .push(channelMethods.matchmakingRestart, {});
};

export default addWaitingRoomListeners;
