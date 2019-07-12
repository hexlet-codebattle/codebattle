import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initialState = {};

export default handleActions({
  [actions.updateExecutionOutput](state, {
    payload: {
      userId, result, percent, asserts, output,
    },
  }) {
    return {
      ...state,
      [userId]: {
        output, result, percent, asserts,
      },
    };
  },
}, initialState);
