import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys } from 'humps';

import loadingStatuses from '../config/loadingStatuses';

import initial from './initial';

const fetchCommonLeaderboard = createAsyncThunk(
  'events/fetchLeaderboard',
  async (
    {
      type,
      pageNumber,
      pageSize,
      clanId,
      userId,
      eventId,
    },
  ) => {
    const params = {
      type,
      clan_id: clanId,
      user_id: userId,
      page_number: pageNumber,
      page_size: pageSize,
    };

    const response = await axios.get(
      `/api/v1/events/${eventId}/leaderboard`,
      { params },
    );

    return camelizeKeys(response.data);
  },
);

const eventSlice = createSlice({
  name: 'event',
  initialState: initial.event,
  reducers: {
    initEvent: (_state, { payload }) => ({
      ...payload,
      loading: loadingStatuses.PENDING,
    }),
    updateEvent: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
  },
  extraReducers: {
    [fetchCommonLeaderboard.pending]: state => {
      state.loading = loadingStatuses.LOADING;
    },
    [fetchCommonLeaderboard.fulfilled]: (state, action) => {
      state.loading = loadingStatuses.PENDING;
      state.commonLeaderboard = {
        items: action.payload.items,
        pageNumber: action.payload.pageInfo.pageNumber,
        pageSize: action.payload.pageInfo.pageSize,
        totalEntries: action.payload.pageInfo.totalEntries,
      };
    },
    [fetchCommonLeaderboard.rejected]: state => {
      state.loading = loadingStatuses.PENDING;
      state.commonLeaderboard = {};
    },
  },
});

const { actions, reducer } = eventSlice;

actions.fetchCommonLeaderboard = fetchCommonLeaderboard;

export { actions };

export default reducer;
