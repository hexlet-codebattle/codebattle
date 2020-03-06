import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const initState = {
  stats: null
};

const chart = createReducer(initState, {
  [actions.fetchLangStats](state, { payload }) {
    return payload;
  }
});

export default chart;
