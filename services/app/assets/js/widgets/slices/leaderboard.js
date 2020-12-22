import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ type, params }, { getState, requestId }) => {
    const { currentRequestId, loading } = getState().leaderboard[type];
    if (loading !== 'pending' || requestId !== currentRequestId) {
      return;
    }

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
      error: null,
      users: null,
      currentRequestId: undefined,
    },
    ever: {
      loading: 'idle',
      error: null,
      users: null,
      currentRequestId: undefined,
    },
  },
  reducers: {},
  extraReducers: {
    [fetchUsers.pending]: (state, action) => {
      const { type } = action.meta.arg;

      if (state[type].loading === 'idle') {
        state[type].loading = 'pending';
        state[type].currentRequestId = action.meta.requestId;
      }
    },
    [fetchUsers.fulfilled]: (state, action) => {
      const { requestId } = action.meta;

      const { type } = action.meta.arg;
      if (
        state[type].loading === 'pending'
        && state[type].currentRequestId === requestId
      ) {
        state[type].loading = 'idle';
        state[type].users = action.payload.users;
        state[type].currentRequestId = undefined;
      }
    },
    [fetchUsers.rejected]: (state, action) => {
      const { requestId } = action.meta;

      const { type } = action.meta.arg;
      if (
        state[type].loading === 'pending'
        && state[type].currentRequestId === requestId
      ) {
        state[type].loading = 'idle';
        state[type].error = action.error;
        state[type].currentRequestId = undefined;
      }
    },
  },
});

const { reducer } = leaderboardSlice;
export const actions = { fetchUsers };
export default reducer;
