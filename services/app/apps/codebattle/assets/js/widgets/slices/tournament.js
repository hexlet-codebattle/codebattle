import { createSlice } from '@reduxjs/toolkit';
import omit from 'lodash/omit';

import TournamentTypes from '../config/tournamentTypes';

import initial from './initial';

const initialState = initial.tournament;

const tournament = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournamentData: (_state, { payload }) => ({
      ...payload,
    }),
    updateTournamentData: (state, { payload }) => ({
      ...state,
      ...(
        [TournamentTypes.arena, TournamentTypes.versus, TournamentTypes.swiss, TournamentTypes.show]
          .includes(payload.type)
          ? omit(payload, ['matches', 'players'])
          : payload
      ),
    }),
    updateTournamentMatches: (state, { payload }) => {
      const newMatches = payload.reduce((acc, match) => ({
        ...acc,
        [match.id]: {
          ...(state.matches[match.id] || {}),
          ...match,
        },
      }), {});

      state.matches = {
        ...state.matches,
        ...newMatches,
      };
    },
    setTournamentTaskList: (state, { payload }) => {
      state.taskList = payload;
    },
    addTournamentPlayer: (state, { payload }) => {
      state.players = { ...state.players, [payload.player.id]: payload.player };
    },
    removeTournamentPlayer: (state, { payload }) => {
      state.players = omit(state.players, [payload.playerId]);
    },
    updateTournamentGameResults: (state, { payload }) => {
      state.gameResults = {
        ...state.gameResults,
        ...payload,
      };
    },
    updateTournamentPlayers: (state, { payload }) => {
      const newPlayers = payload.reduce((acc, player) => ({
        ...acc,
        [player.id]: {
          ...(state.players[player.id] || {}),
          ...player,
        },
      }), {});

      state.players = {
        ...state.players,
        ...newPlayers,
      };
    },
    updateTopPlayers: (state, { payload }) => {
      state.topPlayerIds = payload.map(item => (item.id));
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
    toggleShowBots: state => {
      if (state.type === TournamentTypes.show) {
        state.showBots = !state.showBots;
      }
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
