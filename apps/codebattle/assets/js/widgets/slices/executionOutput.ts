import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import initial, { type ExecutionOutputState } from './initial';

interface ExecutionOutputPayload {
  userId: number;
  [key: string]: unknown;
}

const executionOutput = createSlice({
  name: 'executionOutput',
  initialState: initial.executionOutput,
  reducers: {
    updateExecutionOutput: (
      state,
      { payload: { userId, ...rest } }: PayloadAction<ExecutionOutputPayload>,
    ) => {
      state.results[userId] = rest;
    },
    updateExecutionOutputHistory: (
      state,
      { payload: { userId, ...rest } }: PayloadAction<ExecutionOutputPayload>,
    ) => {
      state.historyResults[userId] = rest;
    },
  },
});

export type { ExecutionOutputState };

const { actions, reducer } = executionOutput;

export { actions };

export default reducer;
