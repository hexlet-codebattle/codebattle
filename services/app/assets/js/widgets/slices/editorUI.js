import { createSlice } from '@reduxjs/toolkit';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';

const initialState = {
  mode: EditorModes.default,
  theme: EditorThemes.dark,
};

const editorUI = createSlice({
  name: 'editorUI',
  initialState,
  reducers: {
    setEditorsMode: (state, { payload }) => {
      state.mode = payload;
    },
    switchEditorsTheme: (state, { payload }) => {
      state.theme = payload;
    },
  },
});

const { actions, reducer } = editorUI;

export { actions };

export default reducer;
