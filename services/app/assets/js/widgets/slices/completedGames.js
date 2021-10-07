import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchCompletedGames = createAsyncThunk(
  'completedGames/fetchCompletedGames',
  async () => {
    const userId = window.location.pathname.split('/').pop();

    const response = await axios.get(`/api/v1/user/${userId}/completed_games?page_size=7`);

    return response.data;
  },
);

export const loadNextPage = createAsyncThunk(
  'completedGames/loadNextPage',
  async page => {
    const userId = window.location.pathname.split('/').pop();

    const response = await axios.get(`/api/v1/user/${userId}/completed_games?page_size=7&page=${page}`);

    return response.data;
  },
);

const completedGames = createSlice({
  name: 'completedGames',
  initialState: {
    completedGames: [],
    nextPage: null,
    totalPages: null,
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
      state.totalPages = payload.page_info.total_pages;
      state.nextPage = payload.page_info.page_number + 1;
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
      state.completedGames = state.completedGames.concat(payload.games);
    },
    [loadNextPage.rejected]: (state, action) => {
      state.status = 'rejected';
      state.error = action.error;
    },
  },
});

const { actions, reducer } = completedGames;
export { actions };
export default reducer;
