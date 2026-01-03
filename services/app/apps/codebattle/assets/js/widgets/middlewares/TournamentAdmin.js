import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import compact from 'lodash/compact';

import { actions } from '../slices';

import Channel from './Channel';

const tournamentId = Gon.getAsset('tournament_id');
const channel = new Channel();

export const setTournamentChannel = (newTournamentId = tournamentId) => {
  const newChannelName = `tournament_admin:${newTournamentId}`;
  channel.setupChannel(newChannelName);
  return channel;
};

const initTournamentChannel = (dispatch, isAdminWidged = false) => {
  const onJoinFailure = (err) => {
    console.error(err);
    // window.location.reload();
  };

  const onJoinSuccess = (response) => {
    if (isAdminWidged) {
      // Handle active_game_id if it exists in the response
      if (response.activeGameId) {
        dispatch(actions.setAdminActiveGameId(response.activeGameId));
      }
      dispatch(
        actions.setTournamentData({
          ...response.tournament,
          topPlayerIds: response.topPlayerIds || [],
          matches: {},
          ranking: response.ranking || { entries: [] },
          players: {},
          playersPageSize: 20,
        }),
      );
    }

    dispatch(actions.updateTournamentRanking(response.ranking));
    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTournamentMatches(compact(response.matches)));
    dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
    dispatch(actions.setReports(compact(response.reports)));
  };

  channel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

  channel.onError(() => {
    dispatch(actions.updateTournamentChannelState(false));
  });
};

// export const soundNotification = notification();

export const connectToTournament = (_machine, newTournamentId, isAdminWidged = false) => (dispatch) => {
    setTournamentChannel(newTournamentId);
    initTournamentChannel(dispatch, isAdminWidged);

    const handleUpdate = (response) => {
      dispatch(actions.updateTournamentData(response.tournament));
      dispatch(
        actions.updateTournamentPlayers(compact(response.players || [])),
      );
      dispatch(
        actions.updateTournamentMatches(compact(response.matches || [])),
      );
      if (response.ranking) {
        dispatch(actions.updateTournamentRanking(response.ranking));
      }
      if (response.tasksInfo) {
        dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
      }
    };

    const handleReportPending = (response) => {
      dispatch(actions.addReport(response.report));
    };

    const handleReportUpdated = (response) => {
      dispatch(actions.updateReport(response.report));
    };

    const handleMatchesUpdate = (response) => {
      dispatch(actions.updateTournamentMatches(compact(response.matches)));
    };

    const handlePlayersUpdate = (response) => {
      dispatch(actions.updateTournamentPlayers(compact(response.players)));
    };

    const handleTournamentRoundCreated = (response) => {
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleRoundFinished = (response) => {
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

    const handleTournamentRestarted = (response) => {
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

    const handlePlayerJoined = (response) => {
      dispatch(actions.addTournamentPlayer(response));
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handlePlayerLeft = (response) => {
      dispatch(actions.removeTournamentPlayer(response));
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleMatchUpserted = (response) => {
      dispatch(actions.updateTournamentMatches(compact([response.match])));
      dispatch(actions.updateTournamentPlayers(compact(response.players)));
    };

    const handleTournamentFinished = (response) => {
      dispatch(actions.updateTournamentData(response.tournament));
    };

    return channel
      .addListener('tournament:update', handleUpdate)
      .addListener('tournament:report:pending', handleReportPending)
      .addListener('tournament:report:updated', handleReportUpdated)
      .addListener('tournament:matches:update', handleMatchesUpdate)
      .addListener('tournament:players:update', handlePlayersUpdate)
      .addListener('tournament:round_created', handleTournamentRoundCreated)
      .addListener('tournament:round_finished', handleRoundFinished)
      .addListener('tournament:player:joined', handlePlayerJoined)
      .addListener('tournament:player:left', handlePlayerLeft)
      .addListener('tournament:match:upserted', handleMatchUpserted)
      .addListener('tournament:restarted', handleTournamentRestarted)
      .addListener('tournament:finished', handleTournamentFinished);
  };

// TODO (tournaments): request matches by searched player id
export const uploadPlayers = (playerIds) => (dispatch, getState) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    channel
      .push('tournament:players:request', { playerIds })
      .receive('ok', (response) => {
        dispatch(actions.updateTournamentPlayers(response.players));
      });
  } else {
    const playerIdsStr = playerIds.join(',');

    axios
      .get(`/api/v1/tournaments/${id}/players?player_ids=${playerIdsStr}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': window.csrf_token,
        },
      })
      .then((response) => {
        dispatch(actions.updateTournamentPlayers(response.players));
      })
      .catch((error) => console.error(error));
  }
};

export const requestMatchesForRound = () => (dispatch) => {
  channel
    .push('tournament:matches:request_for_round', {})
    .receive('ok', (data) => {
      dispatch(actions.updateTournamentMatches(data.matches));
    })
    .receive('error', (error) => console.error(error));
};

export const requestMatchesByPlayerId = (userId) => (dispatch) => {
  channel
    .push('tournament:matches:request', { playerId: userId })
    .receive('ok', (data) => {
      dispatch(actions.updateTournamentMatches(data.matches));
      dispatch(actions.updateTournamentPlayers(data.players));
    });
};

export const uploadPlayersMatches = (playerId) => (dispatch, getState) => {
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
      .then((response) => {
        dispatch(actions.updateTournamentMatches(response.matches));
      })
      .catch((error) => console.error(error));
  }
};

export const createCustomRound = (params) => {
  channel.push('tournament:start_round', params);
};

export const startTournament = () => {
  channel.push('tournament:start', {});
};

export const cancelTournament = () => (dispatch) => {
  channel.push('tournament:cancel', {}).receive('ok', (response) => {
    dispatch(actions.updateTournamentData(response.tournament));
  });
};

export const restartTournament = () => {
  channel.push('tournament:restart', {});
};

export const startRoundTournament = () => {
  channel.push('tournament:start_round', {});
};

export const finishRoundTournament = () => {
  channel.push('tournament:finish_round', {});
};

export const toggleVisibleGameResult = (gameId) => {
  channel.push('tournament:toggle_match_visible', { gameId });
};

export const openUpTournament = () => {
  channel.push('tournament:open_up', {});
};

export const showTournamentResults = () => {
  channel.push('tournament:toggle_show_results', {});
};

export const sendMatchGameOver = (matchId) => {
  channel.push('tournament:match:game_over', { matchId });
};

export const toggleBanUser = (userId, isBanned) => (dispatch) => {
  channel
    .push('tournament:ban:player', { userId })
    .receive('ok', () => dispatch(actions.updateTournamentPlayers([{ id: userId, isBanned }])));
};

export const sendNewReportState = (reportId, state) => (dispatch) => {
  const params = { reportId, state };

  channel
    .push('tournament:report:update', params)
    .receive('ok', (payload) => {
      const report = camelizeKeys(payload.report);
      dispatch(actions.updateReport(report));
    })
    .receive('error', (error) => console.error(error));
};

export const pushActiveMatchToStream = (gameId) => (dispatch) => {
  // Update the Redux state immediately for instant UI feedback
  dispatch(actions.setAdminActiveGameId(gameId));

  // Send the update to the server
  channel
    .push('tournament:stream:active_game', { gameId })
    .receive('error', (error) => console.error(error));
};
