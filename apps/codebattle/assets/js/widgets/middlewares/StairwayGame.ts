import { camelizeKeys } from 'humps';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import set from 'lodash/set';

import { channelTopics } from '../../socket';
import { actions } from '../slices';

import Channel from './Channel';
// import notification from '../utils/notification';

const tournamentId = window.location.pathname.split('/').pop();
const tournamentChannelName = `tournament:${tournamentId}`;
const tournamentChannel = new Channel(tournamentChannelName);

// export const soundNotification = notification();
const connectToStairwayGame = (gameId: number) => (dispatch: any) => {
  const activeMatchChannelName = `game:${gameId}`;
  const activeMatchChannel = new Channel(activeMatchChannelName);
  const onJoinSuccess = (response: any) => {
    const data = camelizeKeys(response);
    dispatch(actions.setGameData(data));
    dispatch(actions.setLangs(data));
    dispatch(actions.updateGamePlayers(data));
    dispatch(actions.setGameTask(data));
  };

  activeMatchChannel.join().receive('ok', onJoinSuccess);
  // .receive('error', onJoinFailure);
};

const initTournamentChannel = (dispatch: any) => {
  const onJoinFailure = () => {
    window.location.reload();
  };

  const onJoinSuccess = (response: any) => {
    const data = camelizeKeys(response);

    dispatch(
      actions.setTournamentData({
        ...data,
        channel: { online: true },
        playersPageNumber: 1,
        playersPageSize: 16,
      }),
    );

    const { gameId } = data.activeMatch;
    dispatch(connectToStairwayGame(gameId));
  };

  tournamentChannel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);
};

export const connectToStairwayTournament = () => (dispatch: any) => {
  initTournamentChannel(dispatch);

  tournamentChannel.addListener(channelTopics.tournamentUpdateTopic, (response: any) => {
    const data = camelizeKeys(response);
    const matches = groupBy(data.tournament.matches, 'roundId');
    set(data, 'tournament.matches', matches);

    dispatch(actions.updateTournamentData(data));
  });

  tournamentChannel.addListener(channelTopics.roundCreatedTopic, (response: any) => {
    const { tournament } = camelizeKeys(response);

    dispatch((actions as any).setNextRound(tournament));
  });
};

const initActiveMatchChannel = (dispatch: any, state: any) => {
  if (state.tournament) {
    if (state.tournament.activeMatchChannel) {
      state.tournament.activeMatchChannel.leave();
    }

    const { gameId } = state.tournament.activeMatch;
    const activeMatchChannelName = `game:${gameId}`;
    const activeMatchChannel = new Channel(activeMatchChannelName);

    const onJoinFailure = () => {
      window.location.reload();
    };

    const onJoinSuccess = (response: any) => {
      const data = camelizeKeys(response);
      dispatch((actions as any).setNextRound(data));
    };

    activeMatchChannel.join().receive('ok', onJoinSuccess).receive('error', onJoinFailure);
  }
};

export const connectToActiveMatch = (activeMatch: any) => (dispatch: any, state: any) => {
  const nextMatchId = find(activeMatch.gameId);
  (initActiveMatchChannel as any)(dispatch, state, nextMatchId);
};
