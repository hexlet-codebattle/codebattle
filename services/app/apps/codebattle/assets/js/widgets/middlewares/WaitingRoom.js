import { makeGameUrl } from '@/utils/urlBuilders';

import { channelMethods, channelTopics } from '../../socket';
import { actions } from '../slices';

let channel = null;

export const addWaitingRoomListeners =
  (oldChannel, waitingRoomMachine, { cancelRedirect = false }) =>
  (dispatch) => {
    channel = oldChannel;
    const handleWaitingRoomStarted = (response) => {
      waitingRoomMachine.send(channelTopics.waitingRoomStartedTopic, {
        payload: response,
      });

      dispatch(actions.setActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomEnded = (response) => {
      waitingRoomMachine.send(channelTopics.waitingRoomEndedTopic, {
        payload: response,
      });

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerBanned = (response) => {
      waitingRoomMachine.send(channelTopics.waitingRoomPlayerBannedTopic, {
        payload: response,
      });

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerUnbanned = (response) => {
      waitingRoomMachine.send(channelTopics.waitingRoomPlayerUnbannedTopic, {
        payload: response,
      });

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerMatchmakingStarted = (response) => {
      waitingRoomMachine.send(
        channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
        { payload: response },
      );

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerMatchmakingResumed = (response) => {
      waitingRoomMachine.send(
        channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
        { payload: response },
      );

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerMatchmakingStopped = (response) => {
      waitingRoomMachine.send(
        channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
        { payload: response },
      );

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerMatchmakingPaused = (response) => {
      waitingRoomMachine.send(
        channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
        { payload: response },
      );

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
    };

    const handleWaitingRoomPlayerMatchCreated = (response) => {
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

    const refs = [
      oldChannel.on(
        channelTopics.waitingRoomStartedTopic,
        handleWaitingRoomStarted,
      ),
      oldChannel.on(channelTopics.waitingRoomEndedTopic, handleWaitingRoomEnded),
      oldChannel.on(
        channelTopics.waitingRoomPlayerBannedTopic,
        handleWaitingRoomPlayerBanned,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerUnbannedTopic,
        handleWaitingRoomPlayerUnbanned,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
        handleWaitingRoomPlayerMatchmakingStarted,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
        handleWaitingRoomPlayerMatchmakingResumed,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
        handleWaitingRoomPlayerMatchmakingStopped,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
        handleWaitingRoomPlayerMatchmakingPaused,
      ),
      oldChannel.on(
        channelTopics.waitingRoomPlayerMatchCreatedTopic,
        handleWaitingRoomPlayerMatchCreated,
      ),
    ];

    const clearWaitingRoomListeners = () => {
      if (oldChannel) {
        oldChannel.off(channelTopics.waitingRoomStartedTopic, refs[0]);
        oldChannel.off(channelTopics.waitingRoomEndedTopic, refs[1]);
        oldChannel.off(channelTopics.waitingRoomPlayerBannedTopic, refs[2]);
        oldChannel.off(channelTopics.waitingRoomPlayerUnbannedTopic, refs[3]);
        oldChannel.off(
          channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
          refs[4],
        );
        oldChannel.off(
          channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
          refs[5],
        );
        oldChannel.off(
          channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
          refs[6],
        );
        oldChannel.off(
          channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
          refs[7],
        );
        oldChannel.off(channelTopics.waitingRoomPlayerMatchCreatedTopic, refs[8]);
      }
    };

    return clearWaitingRoomListeners;
  };

export const pauseWaitingRoomMatchmaking = () => () => {
  channel
    .push(channelMethods.matchmakingPause, {})
    .receive('error', (error) => console.error(error));
};

export const startWaitingRoomMatchmaking = () => () => {
  channel
    .push(channelMethods.matchmakingResume, {})
    .receive('error', (error) => console.error(error));
};

export default addWaitingRoomListeners;
