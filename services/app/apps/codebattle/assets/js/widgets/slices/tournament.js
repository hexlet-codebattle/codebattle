import { createSlice } from '@reduxjs/toolkit';

import initial from './initial';

const initialState = initial.tournament;

const tournament = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournamentData: (state, { payload }) => ({
      ...payload,
      channel: { online: true },
    }),
    updateTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    updateTournamentMatches: (state, { payload }) => {
      const newMatches = payload.reduce((acc, params) => ({
        ...acc,
        [params.id]: {
          ...(state.matches[params.id] || {}),
          ...params,
        },
      }), {});

      state.matches = {
        ...state.matches,
        ...newMatches,
      };
    },
    updateTournamentPlayers: (state, { payload }) => {
      const newPlayers = payload.reduce((acc, params) => ({
        ...acc,
        [params.id]: {
          ...(state.players[params.id] || {}),
          ...params,
        },
      }), {});

      state.players = {
        ...state.players,
        ...newPlayers,
      };
    },
    changeTournamentPageNumber: (state, { payload }) => {
      state.playersPageNumber = payload;
    },
    updateTournamentChannelState: (state, { payload }) => {
      state.channel.online = payload;
    },
    setTournamentPlayers: (state, { payload }) => {
      state.players = payload;
    },
    clearTournamentPlayers: state => {
      state.players = [];
    },
    setTournamentPlayersPageNumber: (state, { payload }) => {
      state.playersPageNumber = payload;
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
