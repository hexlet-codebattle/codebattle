import { handleActions } from 'redux-actions';
import * as actions from '../actions';


const initialState = {
  mode: 'default',
};

const editorUI = handleActions({
  [actions.setEditorsMode](state, { payload: mode }) {
    return {
      ...state,
      mode,
    };
  },
}, initialState);

export default editorUI;
