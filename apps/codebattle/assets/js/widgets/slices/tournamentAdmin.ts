import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import initial, { type TournamentAdminState } from './initial';

const tournamentAdminSlice = createSlice({
  name: 'tournamentAdmin',
  initialState: initial.tournamentAdmin,
  reducers: {
    setAdminActiveGameId: (state, { payload }: PayloadAction<number | null>) => {
      state.activeGameId = payload;
    },
  },
});

export type { TournamentAdminState };

const { actions, reducer } = tournamentAdminSlice;

export { actions };

export default reducer;
