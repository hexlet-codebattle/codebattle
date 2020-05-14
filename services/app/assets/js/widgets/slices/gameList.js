import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialState = {
  activeGames: [],
  completedGames: null,
  loaded: false,
  newGame: { timeoutSeconds: null },
};

const gameList = createSlice({
  name: 'gameList',
  initialState,
  reducers: {
    initGameList: (state, { payload: { activeGames, completedGames, liveTournaments } }) => ({
      ...state,
      activeGames,
      completedGames,
      liveTournaments,
      loaded: true,
    }),
    removeGameLobby: (state, { payload: { id } }) => {
      state.activeGames = _.reject(state.activeGames, { id });
    },
    upsertGameLobby: (state, { payload: { game } }) => {
      const gameToUpdate = _.find(state.activeGames, { id: game.id });
      if (gameToUpdate) {
        Object.assign(gameToUpdate, game);
      } else {
        state.activeGames.push(game);
      }
    },
    selectNewGameTimeout: (state, { payload: { timeoutSeconds } }) => {
      state.newGame.timeoutSeconds = timeoutSeconds;
    },
    finishGame: (state, { payload: { game } }) => {
      state.activeGames = _.reject(state.activeGames, { id: game.id });
      state.completedGames = [game, ...state.completedGames];
    },
  },
});

const { actions, reducer } = gameList;

export { actions };

export default reducer;
