import { camelizeKeys } from 'humps';
import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';
import { getPageProp } from '@/inertia/pageProps';

import TournamentStates from '../config/tournament';
import tournamentSounds from '../config/tournamentSounds';
import TournamentTypes from '../config/tournamentTypes';
import sound from '../lib/sound';
import { actions } from '../slices';
import { getTournamentJoinPayload } from '../utils/tournamentAccess';

import Channel from './Channel';

const tournamentId = getPageProp<number | undefined>('tournament_id');
const tournamentAccessToken = getPageProp<string | undefined>('tournament_access_token');
const channel = new Channel();
if (tournamentId) {
  channel.setupChannel(
    `tournament:${tournamentId}`,
    getTournamentJoinPayload(window.location.search, tournamentAccessToken),
  );
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
  const newChannelName = `tournament:${newTournamentId}`;
  channel.setupChannel(
    newChannelName,
    getTournamentJoinPayload(window.location.search, tournamentAccessToken),
  );
  return channel;
};

const initTournamentChannel = (currentChannel: Channel) => (dispatch: any) => {
  const onJoinFailure = (err: any) => {
    console.error(err);
    // window.location.reload();
  };

  const onJoinSuccess = (response: any) => {
    dispatch(
      actions.setTournamentData({
        ...response.tournament,
        topPlayerIds: response.topPlayerIds || [],
        matches: {},
        ranking: response.ranking ? camelizeKeys(response.ranking) : { entries: [] },
        clans: response.clans || {},
        players: {},
        showBots: response.tournament.type !== TournamentTypes.show,
        channel: { online: true },
        playersPageNumber: 1,
        playersPageSize: 16,
      }),
    );

    dispatch(actions.updateTournamentPlayers(compact(response.players)));
    dispatch(actions.updateTournamentMatches(compact(response.matches)));
    dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
  };

  currentChannel.onMessage((_event: string, payload: any) => camelizeKeys(payload));

  currentChannel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);

  currentChannel.onError(() => {
    dispatch(actions.updateTournamentChannelState(false));
  });
};

// export const soundNotification = notification();

export const connectToTournament = (newTournamentId: number) => (dispatch: any, getState: any) => {
  setTournamentChannel(newTournamentId);
  initTournamentChannel(channel)(dispatch);
  let lastRoundPosition = 0;

  const handleUpdate = (response: any) => {
    dispatch(actions.updateTournamentData(response.tournament));
    dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
    dispatch(actions.updateTournamentMatches(compact(response.matches || [])));
    if (response.tasksInfo) {
      dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
    }
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

  const handleRedirect = (response: any) => {
    const { url } = response || {};
    if (typeof url === 'string' && url.length > 0) {
      window.location.href = url;
    }
  };

  const handleTournamentRankingUpdate = (response: any) => {
    dispatch(
      actions.updateTournamentData({
        ranking: response.ranking,
        clans: response.clans,
      }),
    );
  };

  const handleTournamentResultsUpdated = () => {
    const state = getState();
    const currentUserId = state.user.currentUserId;

    if (
      state.tournament.type === TournamentTypes.ladder &&
      state.tournament.players[currentUserId]
    ) {
      dispatch(requestMatchesByPlayerId(currentUserId));
      dispatch(requestNearestRankingPage(currentUserId, state.tournament.playersPageSize || 16));
    }
  };

  return channel
    .addListener('tournament:update', handleUpdate)
    .addListener('tournament:matches:update', handleMatchesUpdate)
    .addListener('tournament:players:update', handlePlayersUpdate)
    .addListener('tournament:round_created', handleTournamentRoundCreated)
    .addListener('tournament:round_finished', handleRoundFinished)
    .addListener('tournament:player:joined', handlePlayerJoined)
    .addListener('tournament:player:left', handlePlayerLeft)
    .addListener('tournament:match:upserted', handleMatchUpserted)
    .addListener('tournament:restarted', handleTournamentRestarted)
    .addListener('tournament:finished', handleTournamentFinished)
    .addListener('tournament:ranking_update', handleTournamentRankingUpdate)
    .addListener('tournament:results_updated', handleTournamentResultsUpdated)
    .addListener('tournament:redirect', handleRedirect);
};

export const uploadTournamentsByFilter = (from: string, to: string) =>
  requestJson(`api/v1/tournaments?from=${from}&to=${to}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': window.csrf_token || '',
    },
  }).then((response) => {
    const data = camelizeKeys(response);

    return [data.seasonTournaments, data.userTournaments];
  });

export const uploadFinishedTournaments = () =>
  requestJson('api/v1/tournaments/history', {
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': window.csrf_token || '',
    },
  }).then((response) => {
    const data = camelizeKeys(response);

    return data.tournaments;
  });

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

export const getTask = (taskId: number, onSuccess: (data: any) => void) => () => {
  channel.push('tournament:get_task', { taskId }).receive('ok', (payload: any) => {
    const data = camelizeKeys(payload);

    onSuccess(data);
  });
};

export const getResults = (type: string, params: any, onSuccess: (results: any) => void) => () => {
  channel
    .push('tournament:get_results', { params: { type, ...params } })
    .receive('ok', (payload: any) => {
      const data = camelizeKeys(payload);
      console.log(data);

      if (type === PanelModeCodes.topUserByClansMode) {
        const result = Object.values(groupBy(data.results, (item: any) => item.clanRank));
        onSuccess(result);
      } else {
        onSuccess(data.results);
      }
    });
};

export const requestMatchesByPlayerId = (userId: number) => (dispatch: any) => {
  channel.push('tournament:matches:request', { playerId: userId }).receive('ok', (data: any) => {
    dispatch(actions.updateTournamentMatches(data.matches));
    dispatch(actions.updateTournamentPlayers(data.players));
  });
};

export const requestMatchesForRound = () => (dispatch: any) => {
  channel.push('tournament:matches:request_for_round', {}).receive('ok', (data: any) => {
    dispatch(actions.updateTournamentMatches(data.matches));
  });
};

export const requestRankingPage = (page: number, pageSize: number) => (dispatch: any) => {
  channel.push('tournament:ranking:request', { page, pageSize }).receive('ok', (payload: any) => {
    const data = camelizeKeys(payload);
    dispatch(actions.updateTournamentRanking(data.ranking));
  });
};

export const requestNearestRankingPage = (userId: number, pageSize: number) => (dispatch: any) => {
  channel
    .push('tournament:ranking:request', { nearest: true, userId, pageSize })
    .receive('ok', (payload: any) => {
      const data = camelizeKeys(payload);
      dispatch(actions.updateTournamentRanking(data.ranking));
      dispatch(actions.updateTournamentPlayers(data.ranking?.entries || []));
    });
};

export const uploadPlayersMatches = (playerId: number) => (dispatch: any) => {
  requestMatchesByPlayerId(playerId)(dispatch);
};

export const joinTournament = (teamId?: number) => {
  const params = teamId !== undefined ? { teamId } : {};
  channel.push('tournament:join', params);
};

export const leaveTournament = (teamId?: number) => {
  const params = teamId !== undefined ? { teamId } : {};
  channel.push('tournament:leave', params);
};
