import { createSlice } from '@reduxjs/toolkit';
import omit from 'lodash/omit';

import initial from './initial';

const initialState = initial.tournament;

const tournament = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournamentData: (state, { payload }) => ({
      ...payload,
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
    addTournamentPlayer: (state, { payload }) => {
      state.players = { ...state.players, [payload.player.id]: payload.player };
    },
    removeTournamentPlayer: (state, { payload }) => {
      state.players = omit(state.player, [payload.playerId]);
    },
    updateTournamentGameResults: (state, { payload }) => {
      state.gameResults = {
        ...state.gameResults,
        ...payload,
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
