import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import SolutionTypeCodes from '../config/solutionTypes';
import { addRecord, parse } from '../lib/player';

import { actions as editorActions } from './editor';
import { actions as executionOutputActions } from './executionOutput';

export interface PlaybookState {
  mainEvents: unknown[];
  players: unknown[];
  task: Record<string, unknown>;
  initRecords: unknown[];
  solutionType: string;
  records: unknown[] | undefined;
  [key: string]: unknown;
}

const initialState: PlaybookState = {
  mainEvents: [],
  players: [],
  task: {},
  initRecords: [],
  solutionType: SolutionTypeCodes.incomplete,
  records: undefined,
};

const playbook = createSlice({
  name: 'playbook',
  initialState,
  reducers: {
    loadPlaybook: (
      state,
      { payload }: PayloadAction<{ records: string[] } & Record<string, unknown>>,
    ) => {
      const mainEvents = payload.records
        .filter((record) => parse(record).type === 'check_complete')
        .map((record) => parse(record));
      return { ...state, ...payload, mainEvents };
    },
    changeSolutionType: (state, { payload }: PayloadAction<{ solutionType: string }>) => ({
      ...state,
      solutionType: payload.solutionType,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(editorActions.updateEditorText, (state, { payload }) => {
        const { players, records } = addRecord({
          ...state,
          payload,
          type: 'update_editor_data',
        } as unknown as Parameters<typeof addRecord>[0]);

        return {
          ...state,
          players,
          records,
        };
      })
      .addCase(executionOutputActions.updateExecutionOutput, (state, { payload }) => {
        const { players, records } = addRecord({
          ...state,
          payload,
          type: 'check_complete',
        } as unknown as Parameters<typeof addRecord>[0]);

        return {
          ...state,
          players,
          records,
        };
      });
  },
});

const { actions, reducer } = playbook;

export { actions };
export default reducer;
