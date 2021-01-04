import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import moment from 'moment';
import periodTypes from '../config/periodTypes';
import leaderboardTypes from '../config/leaderboardTypes';

const periodMapping = {
  [periodTypes.MONTHLY]: 'month',
  [periodTypes.WEEKLY]: 'week',
};

export const ratingSelector = state => state.leaderboard.perPeriod.users;

export const periodSelector = state => state.leaderboard.perPeriod.period;

const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ leaderboardType, periodType }, { getState, requestId }) => {
    const { currentRequestId, loading } = getState().leaderboard[
      leaderboardType
    ];
    if (loading !== 'pending' || requestId !== currentRequestId) {
      return;
    }

    const baseParams = {
      s: 'rating+desc',
      page_size: '5',
      with_bots: false,
    };

    const params = leaderboardType === leaderboardTypes.PER_PERIOD
        ? {
            ...baseParams,
            date_from: moment()
              .startOf(periodMapping[periodType])
              .utc()
              .format('YYYY-MM-DD'),
          }
        : baseParams;

    const response = await axios.get('/api/v1/users', { params });

    /* eslint-disable-next-line */
    return response.data;
  },
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState: {
    perPeriod: {
      loading: 'idle',
      currentRequestId: undefined,
      users: null,
      period: periodTypes.MONTHLY,
      error: null,
    },
    ever: {
      loading: 'idle',
      currentRequestId: undefined,
      users: null,
      error: null,
    },
  },
  reducers: {
    changePeriod(state, action) {
      state.perPeriod.period = action.payload;
    },
  },
  extraReducers: {
    [fetchUsers.pending]: (state, action) => {
      const { leaderboardType } = action.meta.arg;

      if (state[leaderboardType].loading === 'idle') {
        state[leaderboardType].loading = 'pending';
        state[leaderboardType].currentRequestId = action.meta.requestId;
      }
    },
    [fetchUsers.fulfilled]: (state, action) => {
      const { requestId } = action.meta;

      const { leaderboardType } = action.meta.arg;
      if (
        state[leaderboardType].loading === 'pending'
        && state[leaderboardType].currentRequestId === requestId
      ) {
        state[leaderboardType].loading = 'idle';
        state[leaderboardType].users = action.payload.users;
        state[leaderboardType].currentRequestId = undefined;
      }
    },
    [fetchUsers.rejected]: (state, action) => {
      const { requestId } = action.meta;

      const { leaderboardType } = action.meta.arg;
      if (
        state[leaderboardType].loading === 'pending'
        && state[leaderboardType].currentRequestId === requestId
      ) {
        state[leaderboardType].loading = 'idle';
        state[leaderboardType].error = action.error;
        state[leaderboardType].currentRequestId = undefined;
      }
    },
  },
});

const { actions, reducer } = leaderboardSlice;

actions.fetchUsers = fetchUsers;

export { actions };

export default reducer;
