import { createSlice } from '@reduxjs/toolkit';

import SolutionTypeCodes from '../config/solutionTypes';
import { addRecord, parse } from '../lib/player';

import { actions as editorActions } from './editor';
import { actions as executionOutputActions } from './executionOutput';

const initialState = {
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
    loadPlaybook: (state, { payload }) => {
      const mainEvents = payload.records.filter(record => parse(record).type === 'check_complete').map(parse);
      return { ...state, ...payload, mainEvents };
    },
    changeSolutionType: (state, { payload }) => ({ ...state, solutionType: payload.solutionType }),
  },
  extraReducers: {
    [editorActions.updateEditorText]: (state, { payload }) => {
      const { players, records } = addRecord({
        ...state,
        payload,
        type: 'update_editor_data',
      });

      return {
        ...state,
        players,
        records,
      };
    },
    [executionOutputActions.updateExecutionOutput]: (state, { payload }) => {
      const { players, records } = addRecord({
        ...state,
        payload,
        type: 'check_complete',
      });

      return {
        ...state,
        players,
        records,
      };
    },
  },
});

const { actions, reducer } = playbook;

export { actions };
export default reducer;
