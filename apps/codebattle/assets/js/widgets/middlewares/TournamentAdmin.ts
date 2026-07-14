import Gon from 'gon';
import { camelizeKeys } from 'humps';
import compact from 'lodash/compact';

import TournamentStates from '../config/tournament';
import tournamentSounds from '../config/tournamentSounds';
import sound from '../lib/sound';
import { actions } from '../slices';

import Channel from './Channel';

const tournamentId = Gon.getAsset('tournament_id');
const channel = new Channel();
if (tournamentId) {
  channel.setupChannel(`tournament_admin:${tournamentId}`);
}
const requestJson = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as Error & {
      response?: { data: any; status: number };
    };
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

export const setTournamentChannel = (newTournamentId = tournamentId) => {
  const newChannelName = `tournament_admin:${newTournamentId}`;
  channel.setupChannel(newChannelName);
  return channel;
};

const initTournamentChannel = (dispatch: any, isAdminWidged = false) => {
  const onJoinFailure = (err: any) => {
    console.error(err);
    // window.location.reload();
  };

  const onJoinSuccess = (response: any) => {
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
          playersPageSize: 16,
          channel: { online: true },
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

export const connectToTournament =
  (newTournamentId: number, isAdminWidged = false) =>
  (dispatch: any) => {
    setTournamentChannel(newTournamentId);
    initTournamentChannel(dispatch, isAdminWidged);
    let lastRoundPosition = 0;

    const handleUpdate = (response: any) => {
      dispatch(actions.updateTournamentData(response.tournament));
      dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
      dispatch(actions.updateTournamentMatches(compact(response.matches || [])));
      if (response.ranking) {
        dispatch(actions.updateTournamentRanking(response.ranking));
      }
      if (response.tasksInfo) {
        dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
      }
    };

    const handleReportPending = (response: any) => {
      dispatch(actions.addReport(response.report));
    };

    const handleReportUpdated = (response: any) => {
      dispatch(actions.updateReport(response.report));
    };

    const handleMatchesUpdate = (response: any) => {
      dispatch(actions.updateTournamentMatches(compact(response.matches)));
    };

    const handlePlayersUpdate = (response: any) => {
      dispatch(actions.updateTournamentPlayers(compact(response.players)));
    };

    const handleTournamentRoundCreated = (response: any) => {
      const currentRoundPosition = response.tournament?.currentRoundPosition ?? lastRoundPosition;
      const isFirstRound = currentRoundPosition === 0;
      lastRoundPosition = currentRoundPosition;

      if (isFirstRound) {
        sound.playTournamentAsset(tournamentSounds.started);
      } else {
        sound.playTournamentAsset(tournamentSounds.roundStarted);
      }
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleRoundFinished = (response: any) => {
      if (response.tournament?.state !== TournamentStates.finished) {
        sound.playTournamentAsset(tournamentSounds.roundFinished);
      }
      dispatch(
        actions.updateTournamentData({
          ...response.tournament,
          topPlayerIds: response.topPlayerIds || [],
          playersPageNumber: 1,
          playersPageSize: 16,
        }),
      );

      dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
      dispatch(actions.updateTopPlayers(compact(response.players || [])));
    };

    const handleTournamentRestarted = (response: any) => {
      dispatch(
        actions.setTournamentData({
          ...response.tournament,
          channel: { online: true },
          playersPageNumber: 1,
          playersPageSize: 16,
          matches: {},
          players: {},
          ranking: { entries: [] },
        }),
      );

      dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
    };

    const handlePlayerJoined = (response: any) => {
      dispatch(actions.addTournamentPlayer(response));
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handlePlayerLeft = (response: any) => {
      dispatch(actions.removeTournamentPlayer(response));
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleMatchUpserted = (response: any) => {
      dispatch(actions.updateTournamentMatches(compact([response.match])));
      dispatch(actions.updateTournamentPlayers(compact(response.players)));
    };

    const handleTournamentFinished = (response: any) => {
      sound.playTournamentAsset(tournamentSounds.finished);
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
export const uploadPlayers = (playerIds: number[]) => (dispatch: any, getState: any) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    channel.push('tournament:players:request', { playerIds }).receive('ok', (response: any) => {
      dispatch(actions.updateTournamentPlayers(response.players));
    });
  } else {
    const playerIdsStr = playerIds.join(',');

    requestJson(`/api/v1/tournaments/${id}/players?player_ids=${playerIdsStr}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token || '',
      },
    })
      .then((response) => {
        dispatch(actions.updateTournamentPlayers(response.players));
      })
      .catch((error) => console.error(error));
  }
};

export const requestMatchesForRound = () => (dispatch: any) => {
  channel
    .push('tournament:matches:request_for_round', {})
    .receive('ok', (data: any) => {
      dispatch(actions.updateTournamentMatches(data.matches));
    })
    .receive('error', (error: any) => console.error(error));
};

export const requestAllPlayers = (onSuccess?: (data: any) => void) => (dispatch: any) => {
  channel
    .push('tournament:players:request_all', {})
    .receive('ok', (data: any) => {
      dispatch(actions.updateTournamentPlayers(data.players));
      if (onSuccess) {
        onSuccess(data);
      }
    })
    .receive('error', (error: any) => {
      console.error(error);
      if (onSuccess) {
        onSuccess(null);
      }
    });
};

export const requestMatchesByPlayerId = (userId: number) => (dispatch: any) => {
  channel.push('tournament:matches:request', { playerId: userId }).receive('ok', (data: any) => {
    dispatch(actions.updateTournamentMatches(data.matches));
    dispatch(actions.updateTournamentPlayers(data.players));
  });
};

export const uploadPlayersMatches = (playerId: number) => (dispatch: any, getState: any) => {
  const state = getState();

  const { isLive, id } = state.tournament;

  if (isLive) {
    requestMatchesByPlayerId(playerId)(dispatch);
  } else {
    requestJson(`/api/v1/tournaments/${id}/matches?player_id=${playerId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token || '',
      },
    })
      .then((response) => {
        dispatch(actions.updateTournamentMatches(response.matches));
      })
      .catch((error) => console.error(error));
  }
};

export const createCustomRound = (params: any) => {
  channel.push('tournament:start_round', params);
};

export const startTournament = () => {
  channel.push('tournament:start', {});
};

export const cancelTournament = () => (dispatch: any) => {
  channel.push('tournament:cancel', {}).receive('ok', (response: any) => {
    dispatch(actions.updateTournamentData(response.tournament));
  });
};

export const restartTournament = () => {
  channel.push('tournament:restart', {});
};

export const retryTournament = () => {
  channel.push('tournament:retry', {});
};

export const kickTournamentPlayer = (userId: number, onSuccess?: (payload: any) => void) => {
  channel
    .push('tournament:player:kick', { userId })
    .receive('ok', (payload: any) => {
      if (onSuccess) {
        onSuccess(camelizeKeys(payload));
      }
    })
    .receive('error', (error: any) => console.error(error));
};

export const startRoundTournament = () => {
  channel.push('tournament:start_round', {});
};

export const finishRoundTournament = () => {
  channel.push('tournament:finish_round', {});
};

export const finishTournament = () => {
  channel.push('tournament:finish', {});
};

export const toggleVisibleGameResult = (gameId: number) => {
  channel.push('tournament:toggle_match_visible', { gameId });
};

export const openUpTournament = () => {
  channel.push('tournament:open_up', {});
};

export const showTournamentResults = () => {
  channel.push('tournament:toggle_show_results', {});
};

export const sendMatchGameOver = (matchId: number) => {
  channel.push('tournament:match:game_over', { matchId });
};

export const toggleBanUser = (userId: number, isBanned: boolean) => (dispatch: any) => {
  channel
    .push('tournament:cheater:toggle', { userId })
    .receive('ok', (payload: any) =>
      dispatch(actions.updateTournamentPlayers([{ id: userId, isBanned, state: payload.state }])),
    );
};

export const sendNewReportState = (reportId: number, state: string) => (dispatch: any) => {
  const params = { reportId, state };

  channel
    .push('tournament:report:update', params)
    .receive('ok', (payload: any) => {
      const report = camelizeKeys(payload.report);
      dispatch(actions.updateReport(report));
    })
    .receive('error', (error: any) => console.error(error));
};

export const pushActiveMatchToStream = (gameId: number) => (dispatch: any) => {
  // Update the Redux state immediately for instant UI feedback
  dispatch(actions.setAdminActiveGameId(gameId));

  // Send the update to the server
  channel
    .push('tournament:stream:active_game', { gameId })
    .receive('error', (error: any) => console.error(error));
};
