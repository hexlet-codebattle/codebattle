import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const playerId = Gon.getAsset('player_id');
const channelName = `tournament_player:${tournamentId}_${playerId}`;
const channel = socket.channel(channelName);

const initTournamentPlayerChannel = dispatch => {
  const onJoinFailure = () => {
    dispatch(actions.updateTournamentPlayerChannelState(false));
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData({
      id: data.tournamentId,
      state: data.tournamentState,
      breakState: data.breakState,
      tournamentChannel: { online: true },
    }));

    dispatch(actions.setActiveGameId(data));
  };

  channel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);

  channel.onError(() => {
    dispatch(actions.updateTournamentPlayerChannelState(false));
  });
};

export const connectToTournamentPlayer = () => dispatch => {
  initTournamentPlayerChannel(dispatch);

  const handleRoundFinished = () => {
    // const data = camelizeKeys(response);

    // TODO (tournaments): Implement redirect to roune results, results will be in a payload
    // dispatch(actions.setNextRound(data.tournamentId));
  };

  const handleGameCreated = response => {
    const data = camelizeKeys(response);

    dispatch(actions.clearActiveGameId());
    dispatch(actions.clearGameStatus());

    setTimeout(params => {
      dispatch(actions.setActiveGameId(params));
    }, 1000, data);
  };

  const refs = [
    channel.on('tournament:round_finished', handleRoundFinished),
    channel.on('game:created', handleGameCreated),
  ];

  const clearTournamentPlayerChannel = () => {
    channel.off('tournament:round_finished', refs[0]);
    channel.off('game:created', refs[1]);
  };

  return clearTournamentPlayerChannel;
};

export default connectToTournamentPlayer;
