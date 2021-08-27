// import _ from 'lodash';
// import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import { actions } from '../slices';

// import notification from '../utils/notification';

const tournamentId = Gon.getAsset('tournament_id');
const channelName = `tournament:${tournamentId}`;
const channel = socket.channel(channelName);

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData(data));
  };

  channel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

// export const soundNotification = notification();

export const connectToTournament = () => dispatch => {
  initTournamentChannel(dispatch);

  channel.on('tournament_update', response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData(data));
  });

  // TODO: (client/server) break update event on pieces
  // round:update_match(round, newMatch)
  // round:update_participants(players)
  // round:update_statistics(statistics)
  channel.on('round:created', response => {
    const { tournament } = camelizeKeys(response);

    dispatch(actions.setNextRound(tournament));
  });
};

export const joinTournament = teamId => {
  const params = teamId ? { team_id: teamId } : {};
  channel.push('tournament:join', params).receive('error', error => console.error(error));
};

export const leaveTournament = teamId => {
  const params = teamId ? { team_id: teamId } : {};
  channel.push('tournament:leave', params).receive('error', error => console.error(error));
};

export const startTournament = () => {
  channel.push('tournament:start', {}).receive('error', error => console.error(error));
};

export const cancelTournament = () => {
  channel.push('tournament:cancel', {}).receive('error', error => console.error(error));
};

export const kickFromTournament = () => {
  channel.push('tournament:kick', { user_id: userId }).receive('error', error => console.error(error));
};

export default {};
