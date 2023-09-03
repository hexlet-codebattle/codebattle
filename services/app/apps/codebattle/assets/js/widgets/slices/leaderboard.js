import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import moment from 'moment';

import periodTypes from '../config/periodTypes';

const periodMapping = {
  [periodTypes.ALL]: 'all',
  [periodTypes.MONTHLY]: 'month',
  [periodTypes.WEEKLY]: 'week',
};

export const leaderboardSelector = state => state.leaderboard;

const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ periodType }, { getState }) => {
    const { loading } = getState().leaderboard;
    if (loading !== 'pending') {
      return;
    }

    const baseParams = {
      s: 'rating+desc',
      page_size: '7',
      with_bots: false,
    };

    const params = periodType === periodTypes.ALL
        ? baseParams
        : {
            ...baseParams,
            date_from: moment()
              .startOf(periodMapping[periodType])
              .utc()
              .format('YYYY-MM-DD'),
          };

    const response = await axios.get('/api/v1/users', { params });

    /* eslint-disable-next-line */
    return response.data;
  },
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState: {
    loading: 'idle',
    users: null,
    period: periodTypes.WEEKLY,
    error: null,
  },
  reducers: {
    changePeriod(state, action) {
      state.period = action.payload;
    },
  },
  extraReducers: {
    [fetchUsers.pending]: state => {
      if (state.loading === 'idle') {
        state.loading = 'pending';
      }
    },
    [fetchUsers.fulfilled]: (state, action) => {
      if (state.loading === 'pending') {
        state.loading = 'idle';
        state.users = action.payload.users;
      }
    },
    [fetchUsers.rejected]: (state, action) => {
      if (state.loading === 'pending') {
        state.loading = 'idle';
        state.error = action.error;
      }
    },
  },
});

const { actions, reducer } = leaderboardSlice;

actions.fetchUsers = fetchUsers;

export { actions };

export default reducer;
