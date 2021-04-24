import { createSlice } from '@reduxjs/toolkit';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';
import TaskDescriptionLanguages from '../config/taskDescriptionLanguages';

const initialState = {
  editorMode: EditorModes.default,
  editorTheme: EditorThemes.dark,
  taskDescriptionLanguage: TaskDescriptionLanguages.default,
};

const UIState = createSlice({
  name: 'UIState',
  initialState,
  reducers: {
    setEditorsMode: (state, { payload }) => {
      state.editorMode = payload;
    },
    switchEditorsTheme: (state, { payload }) => {
      state.editorTheme = payload;
    },
    setTaskDescriptionLanguage: (state, { payload }) => {
      state.taskDescriptionLanguage = payload;
    },
  },
});

const { actions, reducer } = UIState;

export { actions };

export default reducer;
