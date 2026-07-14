import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import initial, { type Player, type TournamentPlayerState } from './initial';

const initialState = initial.tournamentPlayer;

const tournament = createSlice({
  name: 'tournamentPlayer',
  initialState,
  reducers: {
    setActiveTournamentId: (state, { payload }: PayloadAction<{ activeTournamentId: number }>) => {
      state.tournamentId = payload.activeTournamentId;
    },
    clearActiveTournamentId: (state) => {
      state.tournamentId = null;
    },
    setActivePlayerId: (state, { payload }: PayloadAction<{ activePlayerId: number }>) => {
      state.playerId = payload.activePlayerId;
    },
    clearActivePlayerId: (state) => {
      state.playerId = null;
    },
    setActiveGameId: (state, { payload }: PayloadAction<{ activeGameId: number }>) => {
      state.gameId = payload.activeGameId;
    },
    clearActiveGameId: (state) => {
      state.gameId = null;
    },
    setActiveTournamentPlayer: (state, { payload }: PayloadAction<Player>) => {
      state.user = { ...payload };
    },
    updateActiveTournamentPlayer: (state, { payload }: PayloadAction<Partial<Player>>) => {
      if (state.user) {
        state.user = { ...state.user, ...payload };
      } else {
        state.user = { ...payload } as Player;
      }
    },
    clearActiveTournamentPlayer: (state) => {
      state.user = null;
    },
    updateTournamentPlayerChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.channel.online = payload;
    },
  },
});

export type { TournamentPlayerState };

const { actions, reducer } = tournament;

export { actions };
export default reducer;
