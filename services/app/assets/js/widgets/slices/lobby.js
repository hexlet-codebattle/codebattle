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
    initGameList: (
      state,
      { payload: { activeGames, completedGames, tournaments } },
    ) => ({
      ...state,
      activeGames,
      completedGames,
      liveTournaments: tournaments.filter(x => x.isLive),
      completedTournaments: tournaments.filter(x => !x.isLive),
      loaded: true,
    }),
    updateCheckResult: (state, { payload }) => {
      state.activeGames = state.activeGames.map(game => {
        if (game.id === payload.gameId) {
          const newPlayers = game.players.map(player => (player.id === payload.userId
              ? { ...player, checkResult: payload.checkResult }
              : player));

          return { ...game, players: newPlayers };
        }

        return game;
      });
    },
    syncPresenceList: (state, { payload }) => {
      state.presenceList = payload;
    },
    removeGameLobby: (state, { payload: { gameId } }) => {
      state.activeGames = _.reject(state.activeGames, { id: gameId });
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
