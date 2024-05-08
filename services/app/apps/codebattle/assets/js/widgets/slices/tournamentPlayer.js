import { createSlice } from '@reduxjs/toolkit';

import initial from './initial';

const initialState = initial.tournamentPlayer;

const tournament = createSlice({
  name: 'tournamentPlayer',
  initialState,
  reducers: {
    setActiveTournamentId: (state, { payload }) => {
      state.tournamentId = payload.activeTournamentId;
    },
    clearActiveTournamentId: state => {
      state.tournamentId = null;
    },
    setActivePlayerId: (state, { payload }) => {
      state.playerId = payload.activePlayerId;
    },
    clearActivePlayerId: state => {
      state.playerId = null;
    },
    setActiveGameId: (state, { payload }) => {
      state.gameId = payload.activeGameId;
    },
    clearActiveGameId: state => {
      state.gameId = null;
    },
    setActiveTournamentPlayer: (state, { payload }) => {
      state.user = { ...payload };
    },
    updateActiveTournamentPlayer: (state, { payload }) => {
      if (state.user) {
        state.user = { ...state.user, ...payload };
      } else {
        state.user = { ...payload };
      }
    },
    clearActiveTournamentPlayer: state => {
      state.user = null;
    },
    updateTournamentPlayerChannelState: (state, { payload }) => {
      state.channel.online = payload;
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
