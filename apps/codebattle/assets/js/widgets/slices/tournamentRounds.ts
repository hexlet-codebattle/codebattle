import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import initial from './initial';

export interface TournamentRoundsState {
  gameId: number | null;
  channel: { online: boolean };
}

// NOTE: `initial.tournamentRounds` is not defined in initial.ts, so this slice
// initializes to `undefined` at runtime. Kept as-is (slice is currently unused);
// typed here only so the module compiles.
const initialState = initial.tournamentRounds as unknown as TournamentRoundsState;

const tournament = createSlice({
  name: 'tournamentRounds',
  initialState,
  reducers: {
    setActiveGameId: (state, { payload }: PayloadAction<{ activeGameId: number }>) => {
      state.gameId = payload.activeGameId;
    },
    clearActiveGameId: (state) => {
      state.gameId = null;
    },
    updateTournamentPlayerChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.channel.online = payload;
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
