import { camelizeKeys } from 'humps';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import set from 'lodash/set';

import socket from '../../socket';
import { actions } from '../slices';

// import notification from '../utils/notification';

const tournamentId = window.location.pathname.split('/').pop();
const tournamentChannelName = `tournament:${tournamentId}`;
const tournamentChannel = socket.channel(tournamentChannelName);

// export const soundNotification = notification();
const connectToStairwayGame = gameId => dispatch => {
  const activeMatchChannelName = `game:${gameId}`;
  const activeMatchChannel = socket.channel(activeMatchChannelName);
  const onJoinSuccess = response => {
    const data = camelizeKeys(response);
    dispatch(actions.setGameData(data));
    dispatch(actions.setLangs(data));
    dispatch(actions.updateGamePlayers(data));
    dispatch(actions.setGameTask(data));
  };

  activeMatchChannel.join().receive('ok', onJoinSuccess);
  // .receive('error', onJoinFailure);
};

const initTournamentChannel = dispatch => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = response => {
    const data = camelizeKeys(response);

    dispatch(actions.setTournamentData({
      ...data,
      channel: { online: true },
      playersPageNumber: 1,
      playersPageSize: 20,
    }));

    const { gameId } = data.activeMatch;
    dispatch(connectToStairwayGame(gameId));
  };

  tournamentChannel
    .join()
    .receive('ok', onJoinSuccess)
    .receive('error', onJoinFailure);
};

export const connectToStairwayTournament = () => dispatch => {
  initTournamentChannel(dispatch);

  tournamentChannel.on('tournament:update', response => {
    const data = camelizeKeys(response);
    const matches = groupBy(data.tournament.matches, 'roundId');
    set(data, 'tournament.matches', matches);

    dispatch(actions.updateTournamentData(data));
  });

  tournamentChannel.on('round:created', response => {
    const { tournament } = camelizeKeys(response);

    dispatch(actions.setNextRound(tournament));
  });
};

const initActiveMatchChannel = (dispatch, state) => {
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

    const onJoinSuccess = response => {
      const data = camelizeKeys(response);
      dispatch(actions.setNextRound(data));
    };

    activeMatchChannel
      .join()
      .receive('ok', onJoinSuccess)
      .receive('error', onJoinFailure);
  }
};

export const connectToActiveMatch = activeMatch => (dispatch, state) => {
  const nextMatchId = find(activeMatch.gameId);
  initActiveMatchChannel(dispatch, state, nextMatchId);
};
