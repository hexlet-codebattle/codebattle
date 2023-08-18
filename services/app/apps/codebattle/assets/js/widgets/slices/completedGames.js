import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys } from 'humps';
import unionBy from 'lodash/unionBy';

import { actions as lobbyActions } from './lobby';
import initial from './initial';

export const fetchCompletedGames = createAsyncThunk(
  'completedGames/fetchCompletedGames',
  async () => {
    const userId = window.location.pathname.split('/').pop() || null;
    const route = userId
      ? `/api/v1/games/completed?user_id=${userId}&page_size=20`
      : '/api/v1/games/completed?page_size=20';

    const response = await axios.get(route);

    return camelizeKeys(response.data);
  },
);

export const loadNextPage = createAsyncThunk(
  'completedGames/loadNextPage',
  async page => {
    const userId = window.location.pathname.split('/').pop() || null;
    const route = userId
      ? `/api/v1/games/completed?user_id=${userId}&page_size=20&page=${page}`
      : `/api/v1/games/completed?page_size=20&page=${page}`;

    const response = await axios.get(route);

    return camelizeKeys(response.data);
  },
);

const completedGames = createSlice({
  name: 'completedGames',
  initialState: {
    completedGames: initial.completedGames,
    nextPage: null,
    totalPages: null,
    totalGames: 0,
    status: 'empty',
    error: null,
  },
  reducers: {},
  extraReducers: {
    [fetchCompletedGames.pending]: state => {
      state.status = 'loading';
      state.error = null;
    },
    [fetchCompletedGames.fulfilled]: (state, { payload }) => {
      state.status = 'loaded';
      state.completedGames = payload.games;
      state.totalPages = payload.pageInfo.totalPages;
      state.nextPage = payload.pageInfo.pageNumber + 1;
      state.totalGames = payload.pageInfo.totalEntries;
    },
    [fetchCompletedGames.rejected]: (state, action) => {
      state.status = 'rejected';
      state.error = action.error;
    },
    [loadNextPage.pending]: state => {
      state.status = 'loading';
      state.error = null;
    },
    [loadNextPage.fulfilled]: (state, { payload }) => {
      state.status = 'loaded';
      state.nextPage += 1;
      state.completedGames = unionBy(state.completedGames, payload.games, 'id');
    },
    [loadNextPage.rejected]: (state, action) => {
      state.status = 'rejected';
      state.error = action.error;
    },
    [lobbyActions.finishGame]: (state, { payload: { game } }) => {
      state.completedGames = [game, ...state.completedGames];
      state.totalGames += 1;
    },
  },
});

const { actions, reducer } = completedGames;
export { actions };
export default reducer;
