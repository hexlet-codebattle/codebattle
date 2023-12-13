import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys } from 'humps';
import unionBy from 'lodash/unionBy';

import fetchionStatuses from '../config/fetchionStatuses';

import initial from './initial';
import { actions as lobbyActions } from './lobby';

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
  async (_, { getState }) => {
    const userId = window.location.pathname.split('/').pop() || null;
    const { completedGames: { currrentPage } } = getState();
    const nextPage = currrentPage + 1;
    const route = userId
      ? `/api/v1/games/completed?user_id=${userId}&page_size=20&page=${nextPage}`
      : `/api/v1/games/completed?page_size=20&page=${nextPage}`;

    const response = await axios.get(route);

    return camelizeKeys(response.data);
  },
  {
    condition: (_, { getState }) => {
      const { completedGames: { currrentPage, totalPages, status } } = getState();
      return status !== fetchionStatuses.loading && currrentPage !== totalPages;
    },
  },
);

const completedGames = createSlice({
  name: 'completedGames',
  initialState: {
    completedGames: initial.completedGames,
    currrentPage: null,
    totalPages: null,
    totalGames: 0,
    status: fetchionStatuses.idle,
    error: null,
  },
  reducers: {},
  extraReducers: {
    [fetchCompletedGames.pending]: state => {
      state.status = fetchionStatuses.loading;
      state.error = null;
    },
    [fetchCompletedGames.fulfilled]: (state, { payload }) => {
      state.status = fetchionStatuses.loaded;
      state.completedGames = payload.games;
      state.totalPages = payload.pageInfo.totalPages;
      state.currrentPage = payload.pageInfo.pageNumber;
      state.totalGames = payload.pageInfo.totalEntries;
    },
    [fetchCompletedGames.rejected]: (state, action) => {
      state.status = fetchionStatuses.rejected;
      state.error = action.error;
    },
    [loadNextPage.pending]: state => {
      state.status = fetchionStatuses.loading;
      state.error = null;
    },
    [loadNextPage.fulfilled]: (state, { payload }) => {
      state.status = fetchionStatuses.loaded;
      state.currrentPage = payload.pageInfo.pageNumber;
      state.completedGames = unionBy(state.completedGames, payload.games, 'id');
    },
    [loadNextPage.rejected]: (state, action) => {
      state.status = fetchionStatuses.rejected;
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
