import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialState = {
  activeGames: [],
  completedGames: null,
  presenceList: [],
  loaded: false,
  newGame: { timeoutSeconds: null },
};

const lobby = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    initGameList: (state, { payload: { activeGames, completedGames, tournaments } }) => ({
      ...state,
      activeGames,
      completedGames,
      liveTournaments: tournaments.filter(x => (x.isLive)),
      completedTournaments: tournaments.filter(x => (!x.isLive)),
      loaded: true,
    }),
    updateCheckResult: (state, { payload }) => {
      state.activeGames = state.activeGames.map(game => {
        if (game.id === payload.id) {
          const playerIndex = game.players.findIndex(player => player.id === payload.userId);
          const newCheckResults = game.checkResults.map(
            (result, index) => (index === playerIndex ? { ...result, ...payload.checkResult } : result),
          );

          return { ...game, checkResults: newCheckResults };
        }

        return game;
      });
    },
    syncPresenceList: (state, { payload }) => {
      state.presenceList = payload;
    },
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

const { actions, reducer } = lobby;

export { actions };

export default reducer;
