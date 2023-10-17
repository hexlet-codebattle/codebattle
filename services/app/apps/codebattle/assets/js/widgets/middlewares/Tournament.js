import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';

import socket from '../../socket';
import TournamentStates from '../config/tournament';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const channelName = `tournament:${tournamentId}`;
const channel = socket.channel(channelName);

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData({
      ...data.tournament,
      channel: { online: true },
      playersPageNumber: 1,
      playersPageSize: 20,
    }));
  };

  channel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);

  channel.onError(() => {
    dispatch(actions.updateTournamentChannelState(false));
  });
};

// export const soundNotification = notification();

export const connectToTournament = () => dispatch => {
  initTournamentChannel(dispatch);

  const handleUpdate = response => {
    const data = camelizeKeys(response);

    dispatch(actions.updateTournamentData(data.tournament));
  };

  const handleRoundCreated = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setNextRound(data.tournament));
  };

  const handleMatchesUpdate = response => {
    const data = camelizeKeys(response);

    dispatch(actions.updateTournamentMatches(data.matches));
  };

  const handlePlayersUpdate = response => {
    const data = camelizeKeys(response);

    dispatch(actions.updateTournamentPlayers(data.players));
  };

  const refs = [
    channel.on('tournament:update', handleUpdate),

    // TODO: (client/server) break update event on pieces
    // round:update_match(round, newMatch)
    // round:update_participants(players)
    // round:update_statistics(statistics)
    channel.on('tournament:round_created', handleRoundCreated),
    // TODO (tournaments): send updates
    channel.on('tournament:matches:update', handleMatchesUpdate),
    channel.on('tournament:players:update', handlePlayersUpdate),
  ];

  const oldChannel = channel;

  const clearTournamentChannel = () => {
    oldChannel.off('tournament:update', refs[0]);
    oldChannel.off('tournament:round_created', refs[1]);
    oldChannel.off('tournament:matches:update', refs[2]);
    oldChannel.off('tournament:players:update', refs[3]);
  };

  return clearTournamentChannel;
};

// TODO (tournaments): request matches by searched player id
export const uploadPlayersMatches = playerId => (dispatch, getState) => {
  const state = getState();

  const { isLive, state: tournamentState, id } = state.tournament;

  if (isLive && tournamentState === TournamentStates.active) {
    channel.push('tournament:matches:request', { player_id: playerId })
      .receive('ok', response => {
        const data = camelizeKeys(response);

        dispatch(actions.updateTournamentMatches(data.matches));
      })
      .receive('error', error => console.error(error));
  } else {
    axios
      .get(`/api/v1/tournaments/${id}/matches?player_id=${playerId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      })
      .then(response => {
        const data = camelizeKeys(response.data);

        dispatch(actions.updateTournamentMatches(data.matches));
      })
      .catch(error => console.error(error));
  }
};

export const subscribePlayers = players => {
  if (players.length < 1) {
    return;
  }

  const ids = players.map(p => p.id);
  // TODO (tournaments): subscribe on players updates
  channel.push('tournament:subscribe_players', { player_ids: ids });
};

export const joinTournament = teamId => {
  const params = teamId !== undefined ? { team_id: teamId } : {};
  channel.push('tournament:join', params).receive('error', error => console.error(error));
};

export const leaveTournament = teamId => {
  const params = teamId !== undefined ? { team_id: teamId } : {};

  channel.push('tournament:leave', params).receive('error', error => console.error(error));
};

export const startTournament = () => {
  channel.push('tournament:start', {}).receive('error', error => console.error(error));
};

export const cancelTournament = () => {
  channel.push('tournament:cancel', {}).receive('error', error => console.error(error));
};

export const restartTournament = () => {
  channel.push('tournament:restart', {}).receive('error', error => console.error(error));
};

export const openUpTournament = () => {
  channel.push('tournament:open_up', {}).receive('error', error => console.error(error));
};

export const kickFromTournament = userId => {
  channel.push('tournament:kick', { user_id: userId }).receive('error', error => console.error(error));
};
