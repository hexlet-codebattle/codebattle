import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';

import loadingStatuses from '../config/loadingStatuses';
import periodTypes from '../config/periodTypes';

import initial, { type LeaderboardState } from './initial';

const periodMapping: Record<string, string> = {
  [periodTypes.ALL]: 'all',
  [periodTypes.MONTHLY]: 'month',
  [periodTypes.WEEKLY]: 'week',
};

export const leaderboardSelector = (state: { leaderboard: LeaderboardState }) => state.leaderboard;

const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ periodType }: { periodType: string }, { getState }) => {
    const { loading } = (getState() as { leaderboard: LeaderboardState }).leaderboard;
    if (loading !== loadingStatuses.PENDING) {
      return [];
    }

    const baseParams = {
      s: 'rating+desc',
      page_size: '7',
      with_bots: false,
    };

    const params =
      periodType === periodTypes.ALL
        ? baseParams
        : {
            ...baseParams,
            date_from: moment()
              .startOf(periodMapping[periodType] as moment.unitOfTime.StartOf)
              .utc()
              .format('YYYY-MM-DD'),
          };

    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    const response = await fetch(`/api/v1/users?${query}`);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  },
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState: initial.leaderboard,
  reducers: {
    changePeriod(state, action: PayloadAction<string>) {
      state.period = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        if (state.loading === loadingStatuses.IDLE) {
          state.loading = loadingStatuses.PENDING;
        }
        if (state.loading === loadingStatuses.INITIAL) {
          state.loading = loadingStatuses.IDLE;
        }
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        if (state.loading === loadingStatuses.PENDING) {
          state.loading = loadingStatuses.IDLE;
          state.users = action.payload.users;
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        if (state.loading === loadingStatuses.PENDING) {
          state.loading = loadingStatuses.IDLE;
          state.error = action.error;
        }
      });
  },
});

const { actions: sliceActions, reducer } = leaderboardSlice;

const actions = {
  ...sliceActions,
  fetchUsers,
};

export { actions };
export type { LeaderboardState };

export default reducer;
