import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys, decamelizeKeys } from 'humps';

import {
  currentUserClanIdSelector,
  currentUserIdSelector,
} from '@/selectors';

import loadingStatuses from '../config/loadingStatuses';

import initial from './initial';

const defaultPageSize = 15;

const fetchCommonLeaderboard = createAsyncThunk(
  'events/fetchLeaderboard',
  async (
    params,
    {
      getState,
    },
  ) => {
    const state = getState();

    params.pageSize = params.pageSize || defaultPageSize;
    params.clanId = params.clanId || currentUserClanIdSelector(state);
    params.userId = params.userId || currentUserIdSelector(state);

    const response = await axios.get(
      `/api/v1/events/${params.eventId}/leaderboard`,
      { params: decamelizeKeys(params, { separator: '_' }) },
    );

    // return {
    //   items: [
    //     { userId: 1, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 2, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 3, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 4, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 5, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 6, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 7, clanId: 1, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 1 },
    //     { userId: 8, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 9, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 10, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 11, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 12, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 13, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 14, clanId: 2, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 2 },
    //     { userId: 15, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 16, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 17, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 18, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 19, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 20, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 21, clanId: 3, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 3 },
    //     { userId: 22, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 23, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 24, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 25, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 26, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 27, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 28, clanId: 4, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 4 },
    //     { userId: 29, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 30, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 31, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 32, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 33, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 34, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
    //     { userId: 10000, clanId: 5, clanName: 'Clan1', longName: 'Clan2', playersCount: 1000, totalScore: 1000, clanRank: 5 },
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
  extraReducers: builder => {
    // builder
    //   .addCase(fetchCommonLeaderboard.pending, state => {
    //     state.loading = loadingStatuses.LOADING;
    //   })
    //   .addCase(fetchCommonLeaderboard.fulfilled, (state, action) => {
    //     state.loading = loadingStatuses.PENDING;
    //     state.commonLeaderboard = {
    //       items: action.payload.items,
    //       pageNumber: action.payload.pageInfo.pageNumber,
    //       pageSize: action.payload.pageInfo.pageSize,
    //       totalEntries: action.payload.pageInfo.totalEntries,
    //     };
    //   })
    //   .addCase(fetchCommonLeaderboard.rejected, state => {
    //     state.loading = loadingStatuses.PENDING;
    //     state.commonLeaderboard = {};
    //   });
  },
});

const { actions, reducer } = eventSlice;

actions.fetchCommonLeaderboard = fetchCommonLeaderboard;

export { actions };

export default reducer;
