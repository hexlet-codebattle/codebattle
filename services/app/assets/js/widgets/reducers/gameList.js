import { createReducer } from '@reduxjs/toolkit';
import _ from 'lodash';
import * as actions from '../actions';

const initialState = {
  activeGames: [],
  completedGames: null,
  loaded: false,
  newGame: { timeoutSeconds: null },
};

const gameList = createReducer(initialState, {
  [actions.initGameList](state, { payload: { activeGames, completedGames, liveTournaments } }) {
    return {
      ...state,
      activeGames,
      completedGames,
      liveTournaments,
      loaded: true,
    };
  },
  [actions.removeGameLobby](state, { payload: { id } }) {
    state.activeGames = _.reject(state.activeGames, { id });
  },
  [actions.upsertGameLobby](state, { payload: { game } }) {
    const gameToUpdate = _.find(state.activeGames, { id: game.id });
    if (gameToUpdate) {
      Object.assign(gameToUpdate, game);
    } else {
      state.activeGames.push(game);
    }
  },
  [actions.selectNewGameTimeout](state, { payload: { timeoutSeconds } }) {
    state.newGame.timeoutSeconds = timeoutSeconds;
  },
  [actions.finishGame](state, { payload: { game } }) {
    state.activeGames = _.reject(state.activeGames, { id: game.id });
    state.completedGames = [game, ...state.completedGames];
  },
});

export default gameList;
