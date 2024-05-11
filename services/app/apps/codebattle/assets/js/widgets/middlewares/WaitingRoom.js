import { makeGameUrl } from '@/utils/urlBuilders';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

export const addWaitingRoomListeners = (channel, waitingRoomMachine) => dispatch => {
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

      dispatch(actions.updateActiveTournamentPlayer(response.currentPlayer));
      setTimeout(() => {
        window.location.replace(makeGameUrl(response.match.gameId));
      }, 10);
    };

    const refs = [
      channel.on(
        channelTopics.waitingRoomStartedTopic,
        handleWaitingRoomStarted,
      ),
      channel.on(channelTopics.waitingRoomEndedTopic, handleWaitingRoomEnded),
      channel.on(
        channelTopics.waitingRoomPlayerBannedTopic,
        handleWaitingRoomPlayerBanned,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerUnbannedTopic,
        handleWaitingRoomPlayerUnbanned,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
        handleWaitingRoomPlayerMatchmakingStarted,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
        handleWaitingRoomPlayerMatchmakingResumed,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
        handleWaitingRoomPlayerMatchmakingStopped,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
        handleWaitingRoomPlayerMatchmakingPaused,
      ),
      channel.on(
        channelTopics.waitingRoomPlayerMatchCreatedTopic,
        handleWaitingRoomPlayerMatchCreated,
      ),
    ];

    const clearWaitingRoomListeners = () => {
      if (channel) {
        channel.off(channelTopics.waitingRoomStartedTopic, refs[0]);
        channel.off(channelTopics.waitingRoomEndedTopic, refs[1]);
        channel.off(channelTopics.waitingRoomPlayerBannedTopic, refs[2]);
        channel.off(channelTopics.waitingRoomPlayerUnbannedTopic, refs[3]);
        channel.off(
          channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
          refs[4],
        );
        channel.off(
          channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
          refs[5],
        );
        channel.off(
          channelTopics.waitingRoomPlayerMatchmakingStoppedTopic,
          refs[6],
        );
        channel.off(
          channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
          refs[7],
        );
        channel.off(channelTopics.waitingRoomPlayerMatchCreatedTopic, refs[8]);
      }
    };

    return clearWaitingRoomListeners;
  };

export default addWaitingRoomListeners;
