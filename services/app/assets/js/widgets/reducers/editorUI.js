import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/EditorThemes';

const initialState = {
  mode: EditorModes.default,
  theme: EditorThemes.dark,
};

const editorUI = handleActions({
  [actions.setEditorsMode](state, { payload: mode }) {
    return {
      ...state,
      mode,
    };
  },
  [actions.switchEditorsTheme](state, { payload: theme }) {
    return {
      ...state,
      theme,
    };
  },
}, initialState);

export default editorUI;
