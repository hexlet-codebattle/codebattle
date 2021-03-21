import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  results: {},
  historyResults: {},
};

const executionOutput = createSlice({
  name: 'executionOutput',
  initialState,
  reducers: {
    updateExecutionOutput: (
      state,
      { payload: { userId, ...rest } },
    ) => {
      state.results[userId] = rest;
    },
    updateExecutionOutputHistory: (
      state,
      { payload: { userId, ...rest } },
    ) => {
      state.historyResults[userId] = rest;
    },
  },
});

const { actions, reducer } = executionOutput;

export { actions };

export default reducer;
