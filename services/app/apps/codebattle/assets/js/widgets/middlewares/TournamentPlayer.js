import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import TournamentStates from '../config/tournament';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const playerId = Gon.getAsset('player_id');
const channelName = `tournament_player:${tournamentId}_${playerId}`;
const channel = socket.channel(channelName);

const initTournamentPlayerChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentPlayerData({
      ...data.tournament,
      tournamentChannel: { online: true },
    }));
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

    // TODO (tournaments): Implement redirect to roune results, results will be in a payload
    dispatch(actions.setNextRound(data.tournamentId));
  };

  const handleGameCreated = response => {
    const data = camelizeKeys(response);

    // TODO (tournaments): Implement redirect to next game screen
    dispatch(actions.setNextGame(data.tournamentId));
  };

  channel.on('tournament:round_finished', handleRoundFinished);
  channel.on('game:created', handleGameCreated);

  return channel;
};

export default connectToTournamentPlayer;
