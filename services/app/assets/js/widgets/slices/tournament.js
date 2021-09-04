import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tournament: {
    id: null,
    creatorId: null,
    type: null,
    name: '',
    state: 'loading',
    startsAt: null,
    data: {
      // TODO: (server) update tournaments match data (array -> object)
      matches: {}, // {1: [], 2: []}
      players: [],
    },
  },
  statistics: null,
};

const tournament = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    cancelTournament: state => {
      state.tournament.state = 'cancelled';
      state.statistics = null;
    },
    setTournamentData: (state, { payload }) => {
      state.tournament = payload.tournament;
      state.statistics = payload.statistics;
    },
    setNextRound: (state, { payload }) => {
      state.tournament = payload;
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
