import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const initialState = {
  showToastActionsAfterGame: false,
};

const gameUI = createReducer(initialState, {
  [actions.updateGameUI](state, { payload }) {
    Object.assign(state, payload);
  },
});

export default gameUI;
