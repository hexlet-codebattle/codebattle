import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';

const initialState = {
  mode: EditorModes.default,
  theme: EditorThemes.dark,
};

const editorUI = createReducer(initialState, {
  [actions.setEditorsMode](state, { payload }) {
    state.mode = payload;
  },
  [actions.switchEditorsTheme](state, { payload }) {
    state.theme = payload;
  },
});

export default editorUI;
