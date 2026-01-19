import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';

import { PanelModeCodes } from '@/pages/tournament/ControlPanel';

import TournamentStates from '../config/tournament';
import tournamentSounds from '../config/tournamentSounds';
import TournamentTypes from '../config/tournamentTypes';
import sound from '../lib/sound';
import { actions } from '../slices';

import Channel from './Channel';

const tournamentId = Gon.getAsset('tournament_id');
const channel = new Channel();

export const setTournamentChannel = (newTournamentId = tournamentId) => {
  const newChannelName = `tournament:${newTournamentId}`;
  channel.setupChannel(newChannelName);
  return channel;
};

const initTournamentChannel = (currentChannel) => (dispatch) => {
    const onJoinFailure = (err) => {
      console.error(err);
      // window.location.reload();
    };

    const onJoinSuccess = (response) => {
      dispatch(
        actions.setTournamentData({
          ...response.tournament,
          topPlayerIds: response.topPlayerIds || [],
          matches: {},
          ranking: response.ranking || { entries: [] },
          clans: response.clans || {},
          players: {},
          showBots: response.tournament.type !== TournamentTypes.show,
          channel: { online: true },
          playersPageNumber: 1,
          playersPageSize: 20,
        }),
      );

      dispatch(actions.updateTournamentPlayers(compact(response.players)));
      dispatch(actions.updateTournamentMatches(compact(response.matches)));
      dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
    };

    currentChannel.onMessage((_event, payload) => camelizeKeys(payload));

    currentChannel
      .join()
      .receive('ok', onJoinSuccess)
      .receive('error', onJoinFailure);

    currentChannel.onError(() => {
      dispatch(actions.updateTournamentChannelState(false));
    });
  };

// export const soundNotification = notification();

export const connectToTournament = (newTournamentId) => (dispatch) => {
    setTournamentChannel(newTournamentId);
    initTournamentChannel(channel)(dispatch);
    let lastRoundPosition = 0;

    const handleUpdate = (response) => {
      dispatch(actions.updateTournamentData(response.tournament));
      dispatch(
        actions.updateTournamentPlayers(compact(response.players || [])),
      );
      dispatch(
        actions.updateTournamentMatches(compact(response.matches || [])),
      );
      if (response.tasksInfo) {
        dispatch(actions.setTournamentTaskList(compact(response.tasksInfo)));
      }
    };

    const handleMatchesUpdate = (response) => {
      dispatch(actions.updateTournamentMatches(compact(response.matches)));
    };

    const handlePlayersUpdate = (response) => {
      dispatch(actions.updateTournamentPlayers(compact(response.players)));
    };

    const handleTournamentRoundCreated = (response) => {
      const currentRoundPosition = response.tournament?.currentRoundPosition || lastRoundPosition;
      const isFirstRound = currentRoundPosition === 0;
      lastRoundPosition = currentRoundPosition;

      if (isFirstRound) {
        sound.playTournamentAsset(tournamentSounds.started);
      } else {
        sound.playTournamentAsset(tournamentSounds.roundStarted);
      }
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleRoundFinished = (response) => {
      if (response.tournament?.state !== TournamentStates.finished) {
        sound.playTournamentAsset(tournamentSounds.roundFinished);
      }
      dispatch(
        actions.updateTournamentData({
          ...response.tournament,
          topPlayerIds: response.topPlayerIds || [],
          playersPageNumber: 1,
          playersPageSize: 20,
        }),
      );

      dispatch(actions.updateTournamentPlayers(compact(response.players || [])));
      dispatch(actions.updateTopPlayers(compact(response.players || [])));
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
      sound.playTournamentAsset(tournamentSounds.finished);
      dispatch(actions.updateTournamentData(response.tournament));
    };

    const handleTournamentRankingUpdate = (response) => {
      dispatch(
        actions.updateTournamentData({
          ranking: response.ranking,
          clans: response.clans,
        }),
      );
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
      .addListener('tournament:ranking_update', handleTournamentRankingUpdate);
  };

export const uploadTournamentsByFilter = (from, to) => axios
    .get(`api/v1/tournaments?from=${from}&to=${to}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': window.csrf_token,
      },
    })
    .then((response) => {
      const data = camelizeKeys(response.data);

      return [data.seasonTournaments, data.userTournaments];
    });

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

export const getTask = (taskId, onSuccess) => () => {
  channel.push('tournament:get_task', { taskId }).receive('ok', (payload) => {
    const data = camelizeKeys(payload);

    onSuccess(data);
  });
};

export const getResults = (type, params, onSuccess) => () => {
  channel
    .push('tournament:get_results', { params: { type, ...params } })
    .receive('ok', (payload) => {
      const data = camelizeKeys(payload);
      console.log(data);

      if (type === PanelModeCodes.topUserByClansMode) {
        const result = Object.values(
          groupBy(data.results, (item) => item.clanRank),
        );
        onSuccess(result);
      } else {
        onSuccess(data.results);
      }
    });
};

export const requestMatchesByPlayerId = (userId) => (dispatch) => {
  channel
    .push('tournament:matches:request', { playerId: userId })
    .receive('ok', (data) => {
      dispatch(actions.updateTournamentMatches(data.matches));
      dispatch(actions.updateTournamentPlayers(data.players));
    });
};

export const uploadPlayersMatches = (playerId) => (dispatch) => {
  requestMatchesByPlayerId(playerId)(dispatch);
};

export const joinTournament = (teamId) => {
  const params = teamId !== undefined ? { teamId } : {};
  channel.push('tournament:join', params);
};

export const leaveTournament = (teamId) => {
  const params = teamId !== undefined ? { teamId } : {};
  channel.push('tournament:leave', params);
};
