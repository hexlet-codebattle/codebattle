import Gon from 'gon';
import { camelizeKeys } from 'humps';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';

const playerId = Gon.getAsset('player_id');
const tournamentId = Gon.getAsset('tournament_id');
const channelName = `spectator:${playerId}`;

let channel = new Channel(channelName, { tournamentId });

export const updateSpectatorChannel = (newPlayerId, newTournamentId) => {
  const newChannelName = `spectator:${newPlayerId}`;
  channel = new Channel(newChannelName, { tournamentId: newTournamentId });
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

  return currentSpectatorChannel
    .addListener(channelTopics.gameCreatedTopic, handleGameCreate);
};
