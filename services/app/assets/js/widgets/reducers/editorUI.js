import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import EditorModes from '../config/editorModes';


const initialState = {
  mode: EditorModes.default,
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
