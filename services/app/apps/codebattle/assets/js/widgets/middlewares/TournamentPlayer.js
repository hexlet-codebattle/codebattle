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
      matches: data.matches,
      gameResults: data.gameResults,
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
    dispatch(actions.updateTournamentGameResults(data.gameResults));
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
    }, 1000, data);
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
