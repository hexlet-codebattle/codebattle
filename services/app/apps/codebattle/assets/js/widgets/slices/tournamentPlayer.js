import { createSlice } from '@reduxjs/toolkit';

import initial from './initial';

const initialState = initial.tournamentPlayer;

const tournament = createSlice({
  name: 'tournamentPlayer',
  initialState,
  reducers: {
    setTournamentPlayerData: (state, { payload }) => ({
      ...payload,
    }),
    updateTournamentPlayerChannelState: (state, { payload }) => {
      state.channel.online = payload;
    },

  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
