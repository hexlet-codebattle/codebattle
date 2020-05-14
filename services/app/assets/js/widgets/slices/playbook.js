import { createSlice } from '@reduxjs/toolkit';
import PlaybookStatusCodes from '../config/playbookStatusCodes';

const initialState = {
  players: [],
  task: {},
  initRecords: [],
  records: null,
  stepCoefficient: 0,
  status: PlaybookStatusCodes.none,
};

const playbook = createSlice({
  name: 'playbook',
  initialState,
  reducers: {
    loadStoredPlaybook: (state, { payload }) => (
      { ...state, ...payload, status: PlaybookStatusCodes.stored }
    ),
    loadActivePlaybook: (state, { payload: records }) => (
      { ...state, records, status: PlaybookStatusCodes.active }
    ),
    updateRecords: (state, { payload: record }) => {
      state.records.push(record);
    },
    setStepCoefficient: state => {
      state.stepCoefficient = 1.0 / state.records.length;
    },
  },
});

const { actions, reducer } = playbook;

export { actions };
export default reducer;
