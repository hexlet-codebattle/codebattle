import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys, decamelizeKeys } from 'humps';
import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

import socket from '../../socket';
import { actions } from '../slices';

const tournamentId = Gon.getAsset('tournament_id');
const channelName = `tournament_admin:${tournamentId}`;
let channel = socket.channel(channelName);

export const updateTournamentChannel = newTournamentId => {
  const newChannelName = `tournament_admin:${newTournamentId}`;
  channel = socket.channel(newChannelName);
};

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    // dispatch(
    //   actions.setTournamentData({
    //     ...response.tournament,
    //     topPlayerIds: response.topPlayerIds || [],
    //     matches: {},
    //     ranking: response.ranking || { entries: [] },
    //     clans: response.clans || {},
    //     players: {},
    //     showBots: response.tournament.type !== TournamentTypes.show,
    //     channel: { online: true },
    //     playersPageNumber: 1,
    //     playersPageSize: 20,
    //   }),
    // );

    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTournamentMatches(compact(response.matches)));
    dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
  };

  channel.onMessage = (_event, payload) => camelizeKeys(payload);

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

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
    if (response.tasksInfo) {
      dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
    }
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
    dispatch(
      actions.updateTournamentData({
        ...response.tournament,
        topPlayerIds: response.topPlayerIds,
        playersPageNumber: 1,
        playersPageSize: 20,
      }),
    );

    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTopPlayers(compact(response.players)));
  };

  const handleTournamentRestarted = response => {
    dispatch(
      actions.setTournamentData({
        ...response.tournament,
        channel: { online: true },
        playersPageNumber: 1,
        playersPageSize: 20,
        matches: {},
        players: {},
      }),
    );
  };

  const handlePlayerJoined = response => {
    dispatch(actions.addTournamentPlayer(response));
    dispatch(actions.updateTournamentData(response.tournament));
  };

  const handlePlayerLeft = response => {
    dispatch(actions.removeTournamentPlayer(response));
    dispatch(actions.updateTournamentData(response.tournament));
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
    if (oldChannel) {
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
      oldChannel.leave();
    }
  };

  return clearTournamentChannel;
};

// TODO (tournaments): request matches by searched player id
export const uploadPlayers = playerIds => (dispatch, getState) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    channel
      .push('tournament:players:request', { player_ids: playerIds })
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

export const requestMatchesByPlayerId = userId => dispatch => {
  channel
    .push('tournament:matches:request', { player_id: userId })
    .receive('ok', data => {
      dispatch(actions.updateTournamentMatches(data.matches));
      dispatch(actions.updateTournamentPlayers(data.players));
    })
    .receive('error', error => console.error(error));
};

export const uploadPlayersMatches = playerId => (dispatch, getState) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    requestMatchesByPlayerId(playerId)(dispatch);
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

export const createCustomRound = params => {
  channel
    .push('tournament:start_round', decamelizeKeys(params))
    .receive('error', error => console.error(error));
};

export const startTournament = () => {
  channel
    .push('tournament:start', {})
    .receive('error', error => console.error(error));
};

export const cancelTournament = () => dispatch => {
  channel
    .push('tournament:cancel', {})
    .receive('ok', response => {
      dispatch(actions.updateTournamentData(response.tournament));
    })
    .receive('error', error => console.error(error));
};

export const restartTournament = () => {
  channel
    .push('tournament:restart', {})
    .receive('error', error => console.error(error));
};

export const startRoundTournament = () => {
  channel
    .push('tournament:start_round', {})
    .receive('error', error => console.error(error));
};

export const finishRoundTournament = () => {
  channel
    .push('tournament:finish_round', {})
    .receive('error', error => console.error(error));
};

export const toggleVisibleGameResult = gameId => {
  channel
    .push('tournament:toggle_match_visible', { game_id: gameId })
    .receive('error', error => console.error(error));
};

export const openUpTournament = () => {
  channel
    .push('tournament:open_up', {})
    .receive('error', error => console.error(error));
};

export const showTournamentResults = () => {
  channel
    .push('tournament:toggle_show_results', {})
    .receive('error', error => console.error(error));
};

export const sendMatchGameOver = matchId => {
  channel
    .push('tournament:match:game_over', { match_id: matchId })
    .receive('error', error => console.error(error));
};

export const toggleBanUser = (userId, isBanned) => dispatch => {
  channel
    .push('tournament:ban:player', { user_id: userId })
    .receive('ok', () => dispatch(actions.updateTournamentPlayers([{ id: userId, isBanned }])))
    .receive('error', error => console.error(error));
};

export const getResults = (type, params, onSuccess) => () => {
  channel
    .push('tournament:get_results', { params: { type, ...decamelizeKeys(params) } })
    .receive('ok', payload => {
      const data = camelizeKeys(payload);

      if (type === PanelModeCodes.topUserByClansMode) {
        const result = Object.values(groupBy(data.results, item => item.clanRank));
        onSuccess(result);
      } else {
        onSuccess(data.results);
      }
    });
};

export const getTask = (taskId, onSuccess) => () => {
  channel
    .push('tournament:get_task', { task_id: taskId })
    .receive('ok', payload => {
      const data = camelizeKeys(payload);

      onSuccess(data.descriptionRu);
    });
};
