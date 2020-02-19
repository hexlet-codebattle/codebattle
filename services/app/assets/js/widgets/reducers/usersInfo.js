import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const initialState = {};

export default createReducer(initialState, {
  [actions.setUserInfo](state, { payload: { user } }) {
    state[user.id] = user;
  },
});
