import { createSlice } from '@reduxjs/toolkit';
import { addRecord } from '../lib/player';
import { actions as editorActions } from './editor';
import { actions as executionOutputActions } from './executionOutput';

const initialState = {
  players: [],
  task: {},
  initRecords: [],
  records: undefined,
};

const playbook = createSlice({
  name: 'playbook',
  initialState,
  reducers: {
    loadPlaybook: (state, { payload }) => (
      { ...state, ...payload }
    ),
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
