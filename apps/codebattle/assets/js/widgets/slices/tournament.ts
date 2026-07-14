import { createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import omit from 'lodash/omit';

import TournamentTypes from '../config/tournamentTypes';

import initial, { type TournamentState } from './initial';

interface TournamentPlayerData {
  id: number;
  [key: string]: unknown;
}

interface TournamentMatch {
  id: number;
  [key: string]: unknown;
}

const initialState = initial.tournament;

export const updateTournamentStateAction = createAction('updateTournamentState');

const tournament = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournamentData: (_state, { payload }: PayloadAction<TournamentState>) => ({
      ...payload,
    }),
    updateTournamentData: (
      state,
      { payload }: PayloadAction<Partial<TournamentState> & { type?: string }>,
    ) => ({
      ...state,
      ...([TournamentTypes.versus, TournamentTypes.swiss, TournamentTypes.show].includes(
        payload.type as string,
      )
        ? omit(payload, ['matches', 'players'])
        : payload),
    }),
    updateTournamentMatches: (state, { payload }: PayloadAction<TournamentMatch[]>) => {
      const newMatches = payload.reduce<Record<number, Record<string, unknown>>>(
        (acc, match) => ({
          ...acc,
          [match.id]: {
            ...(state.matches[match.id] || {}),
            ...match,
          },
        }),
        {},
      );

      state.matches = {
        ...state.matches,
        ...newMatches,
      };
    },
    setTournamentTaskList: (state, { payload }: PayloadAction<unknown[]>) => {
      state.taskList = payload;
    },
    addTournamentPlayer: (state, { payload }: PayloadAction<{ player: TournamentPlayerData }>) => {
      state.players = { ...state.players, [payload.player.id]: payload.player };
    },
    removeTournamentPlayer: (state, { payload }: PayloadAction<{ playerId: number }>) => {
      state.players = omit(state.players, [payload.playerId]);
    },
    updateTournamentGameResults: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      state.gameResults = {
        ...state.gameResults,
        ...payload,
      };
    },
    updateTournamentRanking: (state, { payload }: PayloadAction<TournamentState['ranking']>) => {
      state.ranking = payload;
    },
    updateTournamentPlayers: (state, { payload }: PayloadAction<TournamentPlayerData[]>) => {
      const players = state.players as Record<number, Record<string, unknown>>;
      const newPlayers = payload.reduce<Record<number, Record<string, unknown>>>(
        (acc, player) => ({
          ...acc,
          [player.id]: {
            ...(players[player.id] || {}),
            ...player,
          },
        }),
        {},
      );

      state.players = {
        ...players,
        ...newPlayers,
      };
    },
    updateTopPlayers: (state, { payload }: PayloadAction<Array<{ id: number }>>) => {
      state.topPlayerIds = payload.map((item) => item.id);
    },
    changeTournamentPageNumber: (state, { payload }: PayloadAction<number>) => {
      state.playersPageNumber = payload;
    },
    updateTournamentChannelState: (state, { payload }: PayloadAction<boolean>) => {
      if (state.channel) {
        state.channel.online = payload;
      }
    },
    setTournamentPlayers: (state, { payload }: PayloadAction<TournamentState['players']>) => {
      state.players = payload;
    },
    clearTournamentPlayers: (state) => {
      state.players = [];
    },
    setTournamentPlayersPageNumber: (state, { payload }: PayloadAction<number>) => {
      state.playersPageNumber = payload;
    },
    toggleShowBots: (state) => {
      if (state.type === TournamentTypes.show) {
        state.showBots = !state.showBots;
      }
    },
    changeTournamentState: (state, { payload }: PayloadAction<{ id: number; state: string }>) => {
      if (payload.id === state.id) {
        state.state = payload.state;
      }
    },
  },
});

const { actions, reducer } = tournament;

export { actions };
export default reducer;
