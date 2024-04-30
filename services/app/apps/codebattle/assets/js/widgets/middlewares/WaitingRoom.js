import { channelTopics } from '../../socket';

export const addWaitingRoomListeners = (channel, waitingRoomMachine) => () => {
  const handleWaitingRoomStarted = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomStartedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomEnded = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomEndedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerBanned = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerBannedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerUnbanned = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerUnbannedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerMatchmakingStarted = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingStartedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerMatchmakingResumed = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingResumedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerMatchmakingStoped = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingStopedTopic,
      { payload: response },
    );
  };

  const handleWaitingRoomPlayerMatchmakingPaused = response => {
    waitingRoomMachine.send(
      channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
      { payload: response },
    );
  };
  const refs = [
    channel.on(channelTopics.waitingRoomStartedTopic, handleWaitingRoomStarted),
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
      channelTopics.waitingRoomPlayerMatchmakingStopedTopic,
      handleWaitingRoomPlayerMatchmakingStoped,
    ),
    channel.on(
      channelTopics.waitingRoomPlayerMatchmakingPausedTopic,
      handleWaitingRoomPlayerMatchmakingPaused,
    ),
  ];

  const clearWaitingRoomListeners = () => {
    if (channel) {
      channel.off(channelTopics.waitingRoomStartedTopic, refs[0]);
      channel.off(channelTopics.waitingRoomEndedTopic, refs[1]);
      channel.off(channelTopics.waitingRoomPlayerBannedTopic, refs[2]);
      channel.off(channelTopics.waitingRoomPlayerUnbannedTopic, refs[3]);
      channel.off(channelTopics.waitingRoomPlayerMatchmakingStartedTopic, refs[4]);
      channel.off(channelTopics.waitingRoomPlayerMatchmakingResumedTopic, refs[5]);
      channel.off(channelTopics.waitingRoomPlayerMatchmakingStopedTopic, refs[6]);
      channel.off(channelTopics.waitingRoomPlayerMatchmakingPausedTopic, refs[7]);
    }
  };

  return clearWaitingRoomListeners;
};

export default addWaitingRoomListeners;
