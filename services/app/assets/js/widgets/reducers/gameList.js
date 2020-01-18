import { createReducer } from '@reduxjs/toolkit';
import _ from 'lodash';
import * as actions from '../actions';

const initialState = {
  activeGames: null,
  completedGames: null,
  loaded: false,
  newGame: { timeoutSeconds: null },
};

const gameList = createReducer(initialState, {
  [actions.initGameList](
    state,
    { payload: { activeGames, completedGames, liveTournaments } },
  ) {
    return {
      ...state,
      activeGames,
      completedGames,
      liveTournaments,
      loaded: true,
    };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    state.activeGames.push(game);
  },
  [actions.cancelGameLobby](state, { payload: { gameId } }) {
    state.activeGames = _.reject(state.activeGames, { gameId });
  },
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameToUpdate = _.find(state.activeGames, { gameId: game.gameId });
    if (gameToUpdate) {
      Object.assign(gameToUpdate, game);
    }
  },
  [actions.selectNewGameTimeout](state, { payload: { timeoutSeconds } }) {
    state.newGame.timeoutSeconds = timeoutSeconds;
  },
});

export default gameList;
