/* eslint-disable */
// import _ from 'lodash';
// import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import _ from 'lodash';

import socket from '../../socket';
import { actions } from '../slices';

// import notification from '../utils/notification';

const tournamentId = window.location.pathname.split('/').pop();
const tournamentChannelName = `tournament:${tournamentId}`;
const tournamentChannel = socket.channel(tournamentChannelName);

const initTournamentChannel = (dispatch) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = (response) => {
    const data = camelizeKeys(response);
    dispatch(actions.setTournamentData(data));
    const { gameId } = data.activeMatch;
    dispatch(connectToStairwayGame(gameId));
  };

  tournamentChannel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

// export const soundNotification = notification();
const connectToStairwayGame = (gameId) => (dispatch) => {
  const activeMatchChannelName = `game:${gameId}`;
  const activeMatchChannel = socket.channel(activeMatchChannelName);
  const onJoinSuccess = (response) => {
    const data = camelizeKeys(response);
    dispatch(actions.setGameData(data));
    dispatch(actions.setLangs(data));
    dispatch(actions.updateGamePlayers(data));
    dispatch(actions.setGameTask(data));
  };

  activeMatchChannel.join().receive('ok', onJoinSuccess);
  // .receive('error', onJoinFailure);
};

export const connectToStairwayTournament = () => (dispatch) => {
  initTournamentChannel(dispatch);

  tournamentChannel.on('tournament:update', (response) => {
    const data = camelizeKeys(response);
    const matches = _.groupBy(data.tournament.data.matches, 'roundId');
    _.set(data, 'tournament.data.matches', matches);

    dispatch(actions.setTournamentData(data));
  });

  // TODO: (client/server) break update event on pieces
  // round:update_match(round, newMatch)
  // round:update_participants(players)
  // round:update_statistics(statistics)
  tournamentChannel.on('round:created', (response) => {
    const { tournament } = camelizeKeys(response);

    dispatch(actions.setNextRound(tournament));
  });
};

export const connectToActiveMatch = (activeMatch) => (dispatch, state) => {
  const nextMatchId = _.find(activeMatch.gameId);
  initActiveMatchChannel(dispatch, state, nextMatchId);
};

const initActiveMatchChannel = (dispatch, state, matchId) => {
  if (state.tournament) {
    if (state.tournament.activeMatchChannel) {
      state.tournament.activeMatchChannel.leave();
    }

    const { gameId } = state.tournament.activeMatch;
    const activeMatchChannelName = `game:${gameId}`;
    const activeMatchChannel = socket.channel(activeMatchChannelName);

    const onJoinFailure = () => {
      window.location.reload();
    };

    const onJoinSuccess = (response) => {
      const data = camelizeKeys(response);
      dispatch(actions.setNextRound(data));
    };

    activeMatchChannel
      .join()
      .receive('ok', onJoinSuccess)
      .receive('error', onJoinFailure);
  }
};
export default {};
