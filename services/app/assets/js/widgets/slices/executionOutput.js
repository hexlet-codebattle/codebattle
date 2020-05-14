import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

const executionOutput = createSlice({
  name: 'executionOutput',
  initialState,
  reducers: {
    updateExecutionOutput: (state, { payload: { userId, ...rest } }) => {
      state[userId] = rest;
    },
  },
});

const { actions, reducer } = executionOutput;

export { actions };

export default reducer;
