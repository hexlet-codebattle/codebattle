/* eslint-disable */
// import _ from 'lodash';
// import axios from 'axios';
import Gon from 'gon';
import { camelizeKeys } from 'humps';
import _ from 'lodash';

import socket from '../../socket';
import { actions } from '../slices';

// import notification from '../utils/notification';

const tournamentId = Gon.getAsset('tournament_id');
const tournamentChannelName = `tournament:${tournamentId}`;
const tournamentChannel = socket.channel(tournamentChannelName);

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);
    console.log(data);

    dispatch(actions.setTournamentData(data));
    // dispatch(actions.connectToStairwayGame(data));
  };

  tournamentChannel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);
};

// export const soundNotification = notification();

export const connectToStairwayTournament = () => dispatch => {
  initTournamentChannel(dispatch);

  tournamentChannel.on('tournament:update', response => {
    const data = camelizeKeys(response);
    const matches = _.groupBy(data.tournament.data.matches, 'roundId');
    _.set(data, 'tournament.data.matches', matches);

    dispatch(actions.setTournamentData(data));
  });

  // TODO: (client/server) break update event on pieces
  // round:update_match(round, newMatch)
  // round:update_participants(players)
  // round:update_statistics(statistics)
  tournamentChannel.on('round:created', response => {
    const { tournament } = camelizeKeys(response);

    dispatch(actions.setNextRound(tournament));
  });
};

export const connectToActiveMatch = activeMatch => dispatch => {
  const nextMatch = _.find(activeMatch.gameId);
  initActiveMatchChannel(dispatch, state);
};

const initActiveMatchChannel = (dispatch, state, matchId) => {
  if (state.tournament.activeMatchChannel) {
    state.tournament.activeMatchChannel.leave();
  }

  const { gameId } = state.tournament.activeMatch;
  const activeMatchChannelName = `game:${gameId}`;
  const activeMatchChannel = socket.channel(activeMatchChannelName);

  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);
    console.log(data);

    dispatch(actions.setNextRoj(data));
    // dispatch(actions.connectToStairwayGame(data));
  };

  activeMatchChannel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);
};
export default {};
