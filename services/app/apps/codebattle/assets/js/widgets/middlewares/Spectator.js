import Gon from 'gon';
import { camelizeKeys } from 'humps';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';

const playerId = Gon.getAsset('player_id');
const tournamentId = Gon.getAsset('tournament_id');

const channel = new Channel();

export const setSpectatorChannel = (newPlayerId = playerId, newTournamentId = tournamentId) => {
  const newChannelName = `spectator:${newPlayerId}`;
  channel.setupChannel(newChannelName, { tournamentId: newTournamentId });
};

const initSpectatorChannel = (dispatch, spectatorChannel) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = (response) => {
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

export const connectToSpectator = () => (dispatch) => {
  setSpectatorChannel();
  initSpectatorChannel(dispatch, channel);

  const handleGameCreate = (payload) => {
    const data = camelizeKeys(payload);

    dispatch(actions.clearActiveGameId());
    dispatch(actions.clearGameStatus());

    setTimeout((params) => {
      dispatch(actions.setActiveGameId(params));
    }, 10, data);
  };

  return channel
    .addListener(channelTopics.gameCreatedTopic, handleGameCreate);
};
