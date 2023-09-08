import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const channelName = `tournament:${tournamentId}`;
const channel = socket.channel(channelName);

const initTournamentChannel = (dispatch) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = (response) => {
    const data = camelizeKeys(response);

    console.log(data.tournament);
    dispatch(actions.setTournamentData(data.tournament));
  };

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

  channel.onError(() => {
    dispatch(actions.updateTournamentChannelState(false));
  });
};

// export const soundNotification = notification();

export const connectToTournament = () => (dispatch) => {
  initTournamentChannel(dispatch);

  const handleUpdate = (response) => {
    const data = camelizeKeys(response);

    dispatch(actions.updateTournamentData(data.tournament));
  };

  const handleRoundCreated = (response) => {
    const data = camelizeKeys(response);

    dispatch(actions.setNextRound(data.tournament));
  };

  const refs = [
    channel.on('tournament:update', handleUpdate),

    // TODO: (client/server) break update event on pieces
    // round:update_match(round, newMatch)
    // round:update_participants(players)
    // round:update_statistics(statistics)
    channel.on('tournament:round_created', handleRoundCreated),
  ];

  const oldChannel = channel;

  const clearTournamentChannel = () => {
    oldChannel.off('tournament:update', refs[0]);
    oldChannel.off('tournament:round_created', refs[1]);
  };

  return clearTournamentChannel;
};

export const joinTournament = (teamId) => {
  const params = teamId ? { team_id: teamId } : {};
  channel.push('tournament:join', params).receive('error', (error) => console.error(error));
};

export const leaveTournament = (teamId) => {
  const params = teamId ? { team_id: teamId } : {};
  channel.push('tournament:leave', params).receive('error', (error) => console.error(error));
};

export const startTournament = () => {
  channel.push('tournament:start', {}).receive('error', (error) => console.error(error));
};

export const cancelTournament = () => {
  channel.push('tournament:cancel', {}).receive('error', (error) => console.error(error));
};

export const restartTournament = () => {
  channel.push('tournament:restart', {}).receive('error', (error) => console.error(error));
};

export const openUpTournament = () => {
  channel.push('tournament:open_up', {}).receive('error', (error) => console.error(error));
};

export const kickFromTournament = (userId) => {
  channel
    .push('tournament:kick', { user_id: userId })
    .receive('error', (error) => console.error(error));
};

export default {};
