import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket, { channelTopics } from '../../socket';
import { actions } from '../slices';

const playerId = Gon.getAsset('player_id');
const tournamentId = Gon.getAsset('tournament_id');
const channelName = `spectator:${playerId}`;
let channel = socket.channel(channelName, { tournament_id: tournamentId });

export const updateSpectatorChannel = (newPlayerId, newTournamentId) => {
  const newChannelName = `spectator:${newPlayerId}`;
  channel = socket.channel(newChannelName, { tournament_id: newTournamentId });
};

const initSpectatorChannel = (dispatch, spectatorChannel) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setActiveGameId(data));

    dispatch(actions.setTournamentData({
      id: data.tournamentId,
      type: data.type,
      state: data.state,
      breakState: data.breakState,
      currentRoundPosition: data.currentRoundPosition,
      matches: data.matches,
    }));

    dispatch(actions.updateTournamentPlayerChannelState(true));
  };

  spectatorChannel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);

  spectatorChannel.onError(() => {
    dispatch(actions.updateTournamentChannelState(false));
  });
};

// export const soundNotification = notification();

export const connectToSpectator = () => dispatch => {
  const currentSpectatorChannel = channel;
  initSpectatorChannel(dispatch, currentSpectatorChannel);

  const handleGameCreate = payload => {
    const data = camelizeKeys(payload);

    dispatch(actions.clearActiveGameId());
    dispatch(actions.clearGameStatus());

    setTimeout(params => {
      dispatch(actions.setActiveGameId(params));
    }, 10, data);
  };

  const refs = [
    currentSpectatorChannel.on(channelTopics.gameCreatedTopic, handleGameCreate),
  ];

  const clearSpectatorChannel = () => {
    currentSpectatorChannel.off(channelTopics.gameCreatedTopic, refs[0]);
  };

  return clearSpectatorChannel;
};
