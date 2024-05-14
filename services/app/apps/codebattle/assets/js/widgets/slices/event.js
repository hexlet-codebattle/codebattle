import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys, decamelizeKeys } from 'humps';

import {
  currentUserClanIdSelector,
  currentUserIdSelector,
} from '@/selectors';

import loadingStatuses from '../config/loadingStatuses';

import initial from './initial';

const fetchCommonLeaderboard = createAsyncThunk(
  'events/fetchLeaderboard',
  async (
    params,
    {
      getState,
    },
  ) => {
    const state = getState();

    params.clanId = params.clanId || currentUserClanIdSelector(state);
    params.userId = params.userId || currentUserIdSelector(state);

    const response = await axios.get(
      `/api/v1/events/${params.eventId}/leaderboard`,
      { params: decamelizeKeys(params, { separator: '_' }) },
    );

    // return {
    //   items: [
    //     { id: 101, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 1 },
    //     { id: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 2 },
    //     { id: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 3 },
    //     { id: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 4 },
    //     { id: 101, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 5 },
    //     { id: 6, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 6 },
    //     { id: 7, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, score: 1000, place: 7 },
    //   ],
    //   pageInfo: { pageNumber: 1, pageSize: 10, totalEntries: 1000 },
    // };
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
