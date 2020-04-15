import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import PlaybookStatusCodes from '../config/playbookStatusCodes';

const initialState = {
  players: [],
  task: {},
  initRecords: [],
  records: null,
  stepCoefficient: 0,
  status: PlaybookStatusCodes.none,
};

export default createReducer(initialState, {
  [actions.loadStoredPlaybook](state, { payload }) {
    return { ...state, ...payload, status: PlaybookStatusCodes.stored };
  },
  [actions.loadActivePlaybook](state, { payload: records }) {
    return { ...state, records, status: PlaybookStatusCodes.active };
  },
  [actions.updateRecords](state, { payload: record }) {
    state.records.push(record);
  },
  [actions.setStepCoefficient](state) {
    state.stepCoefficient = 1.0 / state.records.length;
  },
});
