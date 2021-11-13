import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialState = {
  liveGames: [],
  completedGames: null,
  presenceList: [],
  loaded: false,
  newGame: { timeoutSeconds: null },
};

const lobby = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    initGameList: (state, { payload: { liveGames, completedGames, tournaments } }) => ({
      ...state,
      liveGames,
      completedGames,
      liveTournaments: tournaments.filter(x => (x.isLive)),
      completedTournaments: tournaments.filter(x => (!x.isLive)),
      loaded: true,
    }),
    syncPresenceList: (state, { payload }) => {
      state.presenceList = payload;
    },
    removeGameLobby: (state, { payload: { id } }) => {
      state.liveGames = _.reject(state.liveGames, { id });
    },
    upsertGameLobby: (state, { payload: { game } }) => {
      const gameToUpdate = _.find(state.liveGames, { id: game.id });
      if (gameToUpdate) {
        Object.assign(gameToUpdate, game);
      } else {
        state.liveGames.push(game);
      }
    },
    selectNewGameTimeout: (state, { payload: { timeoutSeconds } }) => {
      state.newGame.timeoutSeconds = timeoutSeconds;
    },
    finishGame: (state, { payload: { game } }) => {
      state.liveGames = _.reject(state.liveGames, { id: game.id });
      state.completedGames = [game, ...state.completedGames];
    },
  },
});

const { actions, reducer } = lobby;

export { actions };

export default reducer;
