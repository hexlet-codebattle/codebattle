import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const playerId = Gon.getAsset('player_id');
const channelName = `tournament_player:${tournamentId}_${playerId}`;

let channel = playerId ? socket.channel(channelName) : null;

export const updateTournamentPlayerChannel = (newTournamentId, newPlayerId) => {
  const newChannelName = `tournament_player:${newTournamentId}_${newPlayerId}`;
  channel = newTournamentId && newPlayerId
    ? socket.channel(newChannelName)
    : null;
};

const initTournamentPlayerChannel = dispatch => {
  const onJoinFailure = () => {
    dispatch(actions.updateTournamentPlayerChannelState(false));
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData({
      id: data.tournamentId,
      state: data.state,
      type: data.type,
      breakState: data.breakState,
      currentRound: data.currentRound,
      matches: data.matches,
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

  const handleRoundFinished = response => {
    const data = camelizeKeys(response);

    dispatch(actions.updateTournamentData({ state: data.state, breakState: data.breakState }));
    dispatch(actions.updateTournamentMatches(data.matches));
  };

  const handleTournamentRoundCreated = response => {
    const data = camelizeKeys(response);
    dispatch(actions.updateTournamentData(data));
  };

  const handleGameCreated = response => {
    const data = camelizeKeys(response);

    dispatch(actions.clearActiveGameId());
    dispatch(actions.clearGameStatus());

    setTimeout(params => {
      dispatch(actions.setActiveGameId(params));
    }, 10, data);
  };

  const refs = [
    channel.on('tournament:round_created', handleTournamentRoundCreated),
    channel.on('tournament:round_finished', handleRoundFinished),
    channel.on('game:created', handleGameCreated),
  ];

  const clearTournamentPlayerChannel = () => {
    channel.off('tournament:round_created', refs[0]);
    channel.off('tournament:round_finished', refs[1]);
    channel.off('game:created', refs[2]);
  };

  return clearTournamentPlayerChannel;
};

export default connectToTournamentPlayer;
