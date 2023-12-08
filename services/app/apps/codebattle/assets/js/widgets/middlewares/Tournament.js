import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import compact from 'lodash/compact';

import socket from '../../socket';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const channelName = `tournament:${tournamentId}`;
let channel = socket.channel(channelName);

export const updateTournamentChannel = newTournamentId => {
  const newChannelName = `tournament:${newTournamentId}`;
  channel = socket.channel(newChannelName);
};

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    dispatch(actions.setTournamentData({
      ...response.tournament,
      topPlayersIds: response.topPlayersIds || [],
      matches: {},
      players: {},
      channel: { online: true },
      playersPageNumber: 1,
      playersPageSize: 20,
    }));

    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTournamentMatches(compact(response.matches)));
  };

  channel.onMessage = (_event, payload) => camelizeKeys(payload);

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

  const oldChannel = channel;

  const handleUpdate = response => {
    dispatch(actions.updateTournamentData(response.tournament));
    dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
    dispatch(actions.updateTournamentMatches(compact(response.matches || [])));
  };

  const handleMatchesUpdate = response => {
    dispatch(actions.updateTournamentMatches(compact(response.matches)));
  };

  const handlePlayersUpdate = response => {
    dispatch(actions.updateTournamentPlayers(compact(response.players)));
  };

  const handleTournamentRoundCreated = response => {
    dispatch(actions.updateTournamentData(response.tournament));
  };

  const handleRoundFinished = response => {
    dispatch(actions.updateTournamentData({
      ...response.tournament,
      topPlayersIds: response.topPlayersIds,
    }));

    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTopPlayers(compact(response.players)));
  };

  const handleTournamentRestarted = response => {
    dispatch(actions.setTournamentData({
      ...response.tournament,
      channel: { online: true },
      playersPageNumber: 1,
      playersPageSize: 20,
    }));
  };

  const handlePlayerJoined = response => {
    dispatch(actions.addTournamentPlayer(response));
    dispatch(actions.updateTournamentData(
      response.tournament,
    ));
  };

  const handlePlayerLeft = response => {
    dispatch(actions.removeTournamentPlayer(response));
    dispatch(actions.updateTournamentData(
      response.tournament,
    ));
  };

  const handleMatchUpserted = response => {
    dispatch(actions.updateTournamentMatches(compact([response.match])));
    dispatch(actions.updateTournamentPlayers(compact(response.players)));
  };

  const handleTournamentFinished = response => {
    dispatch(actions.updateTournamentData(response.tournament));
  };

  const refs = [
    oldChannel.on('tournament:update', handleUpdate),
    oldChannel.on('tournament:matches:update', handleMatchesUpdate),
    oldChannel.on('tournament:players:update', handlePlayersUpdate),
    oldChannel.on('tournament:round_created', handleTournamentRoundCreated),
    oldChannel.on('tournament:round_finished', handleRoundFinished),
    oldChannel.on('tournament:player:joined', handlePlayerJoined),
    oldChannel.on('tournament:player:left', handlePlayerLeft),
    oldChannel.on('tournament:match:upserted', handleMatchUpserted),
    oldChannel.on('tournament:restarted', handleTournamentRestarted),
    oldChannel.on('tournament:finished', handleTournamentFinished),
  ];

  const clearTournamentChannel = () => {
    oldChannel.off('tournament:update', refs[0]);
    oldChannel.off('tournament:matches:update', refs[1]);
    oldChannel.off('tournament:players:update', refs[2]);
    oldChannel.off('tournament:round_created', refs[3]);
    oldChannel.off('tournament:round_finished', refs[4]);
    oldChannel.off('tournament:player:joined', refs[5]);
    oldChannel.off('tournament:player:left', refs[6]);
    oldChannel.off('tournament:match:upserted', refs[7]);
    oldChannel.off('tournament:restarted', refs[8]);
    oldChannel.off('tournament:finished', refs[9]);
  };

  return clearTournamentChannel;
};

// TODO (tournaments): request matches by searched player id
export const uploadPlayers = playerIds => (dispatch, getState) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    channel.push('tournament:players:request', { player_ids: playerIds })
      .receive('ok', response => {
        dispatch(actions.updateTournamentPlayers(response.players));
      })
      .receive('error', error => console.error(error));
  } else {
    const playerIdsStr = playerIds.join(',');

    axios
      .get(`/api/v1/tournaments/${id}/players?player_ids=${playerIdsStr}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      })
      .then(response => {
        dispatch(actions.updateTournamentPlayers(response.players));
      })
      .catch(error => console.error(error));
  }
};

export const uploadPlayersMatches = playerId => (dispatch, getState) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    channel.push('tournament:matches:request', { player_id: playerId })
      .receive('ok', response => {
        dispatch(actions.updateTournamentMatches(response.matches));
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
        dispatch(actions.updateTournamentMatches(response.matches));
      })
      .catch(error => console.error(error));
  }
};

export const subscribePlayers = players => {
  if (players.length < 1) {
    return;
  }

  const ids = players.map(p => p.id);
  // TODO (tournaments): Implement unsubscribe
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

export const startRoundTournament = () => {
  channel.push('tournament:start_round', {}).receive('error', error => console.error(error));
};

export const finishRoundTournament = () => {
  channel.push('tournament:finish_round', {}).receive('error', error => console.error(error));
};

export const openUpTournament = () => {
  channel.push('tournament:open_up', {}).receive('error', error => console.error(error));
};

export const showTournamentResults = () => {
  channel.push('tournament:toggle_show_results', {}).receive('error', error => console.error(error));
};

export const kickFromTournament = userId => {
  channel.push('tournament:kick', { user_id: userId }).receive('error', error => console.error(error));
};

export const toggleBanUser = userId => {
  channel.push('tournament:ban:player', { user_id: userId }).receive('error', error => console.error(error));
};

export const requestMatchesByPlayerId = userId => dispatch => {
  channel.push('tournament:matches:request', { player_id: userId })
    .receive('ok', data => {
       dispatch(actions.updateTournamentMatches(data.matches));
       dispatch(actions.updateTournamentPlayers(data.players));
    })
    .receive('error', error => console.error(error));
};
