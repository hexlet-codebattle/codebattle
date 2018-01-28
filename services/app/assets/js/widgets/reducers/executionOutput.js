import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initialState = '';

export default handleActions({
  [actions.updateExecutionOutput](state, { payload: { output } }) {
    return output || state;
  },
}, initialState);
