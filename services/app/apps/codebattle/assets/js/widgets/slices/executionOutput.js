import { createSlice } from '@reduxjs/toolkit';

import initial from './initial';

const executionOutput = createSlice({
  name: 'executionOutput',
  initialState: initial.executionOutput,
  reducers: {
    updateExecutionOutput: (state, { payload: { userId, ...rest } }) => {
      state.results[userId] = rest;
    },
    updateExecutionOutputHistory: (state, { payload: { userId, ...rest } }) => {
      state.historyResults[userId] = rest;
    },
  },
});

const { actions, reducer } = executionOutput;

export { actions };

export default reducer;
