import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const initialState = {};

export default createReducer(initialState, {
  [actions.updateExecutionOutput](state, { payload: { userId, ...rest } }) {
    state[userId] = rest;
  },
});
