import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { camelizeKeys } from 'humps';
import unionBy from 'lodash/unionBy';

import fetchionStatuses from '../config/fetchionStatuses';

import initial from './initial';
import { actions as lobbyActions } from './lobby';

interface CompletedGame {
  id: number;
  [key: string]: unknown;
}

interface CompletedGamesPayload {
  games: CompletedGame[];
  pageInfo: {
    totalPages: number;
    pageNumber: number;
    totalEntries: number;
    [key: string]: unknown;
  };
}

export interface CompletedGamesState {
  completedGames: CompletedGame[];
  currrentPage: number | null;
  totalPages: number | null;
  totalGames: number;
  status: string;
  error: unknown;
}

interface CompletedGamesRootState {
  completedGames: CompletedGamesState;
}

export const fetchCompletedGames = createAsyncThunk(
  'completedGames/fetchCompletedGames',
  async () => {
    const userId = window.location.pathname.split('/').pop() || null;
    const route = userId
      ? `/api/v1/games/completed?user_id=${userId}&page_size=20`
      : '/api/v1/games/completed?page_size=20';

    const response = await fetch(route);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return camelizeKeys(await response.json()) as unknown as CompletedGamesPayload;
  },
);

export const loadNextPage = createAsyncThunk(
  'completedGames/loadNextPage',
  async (_, { getState }) => {
    const userId = window.location.pathname.split('/').pop() || null;
    const {
      completedGames: { currrentPage },
    } = getState() as CompletedGamesRootState;
    const nextPage = (currrentPage ?? 0) + 1;
    const route = userId
      ? `/api/v1/games/completed?user_id=${userId}&page_size=20&page=${nextPage}`
      : `/api/v1/games/completed?page_size=20&page=${nextPage}`;

    const response = await fetch(route);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return camelizeKeys(await response.json()) as unknown as CompletedGamesPayload;
  },
  {
    condition: (_, { getState }) => {
      const {
        completedGames: { currrentPage, totalPages, status },
      } = getState() as CompletedGamesRootState;
      return status !== fetchionStatuses.loading && currrentPage !== totalPages;
    },
  },
);

const initialState: CompletedGamesState = {
  completedGames: initial.completedGames as CompletedGame[],
  currrentPage: null,
  totalPages: null,
  totalGames: 0,
  status: fetchionStatuses.idle,
  error: null,
};

const completedGames = createSlice({
  name: 'completedGames',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompletedGames.pending, (state) => {
        state.status = fetchionStatuses.loading;
        state.error = null;
      })
      .addCase(fetchCompletedGames.fulfilled, (state, { payload }) => {
        state.status = fetchionStatuses.loaded;
        state.completedGames = payload.games;
        state.totalPages = payload.pageInfo.totalPages;
        state.currrentPage = payload.pageInfo.pageNumber;
        state.totalGames = payload.pageInfo.totalEntries;
      })
      .addCase(fetchCompletedGames.rejected, (state, action) => {
        state.status = fetchionStatuses.rejected;
        state.error = action.error;
      })
      .addCase(loadNextPage.pending, (state) => {
        state.status = fetchionStatuses.loading;
        state.error = null;
      })
      .addCase(loadNextPage.fulfilled, (state, { payload }) => {
        state.status = fetchionStatuses.loaded;
        state.currrentPage = payload.pageInfo.pageNumber;
        state.completedGames = unionBy(state.completedGames, payload.games, 'id');
      })
      .addCase(loadNextPage.rejected, (state, action) => {
        state.status = fetchionStatuses.rejected;
        state.error = action.error;
      })
      .addCase(lobbyActions.finishGame, (state, { payload: { game } }) => {
        state.completedGames = [game, ...state.completedGames];
        state.totalGames += 1;
      });
  },
});

const { actions, reducer } = completedGames;
export { actions };
export default reducer;
