import { createSlice } from '@reduxjs/toolkit';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';
import TaskDescriptionLanguages from '../config/taskDescriptionLanguages';

const persistWhitelist = [
  'editorMode',
  'editorTheme',
  'taskDescriptionLanguage',
];

const initialState = {
  editorMode: EditorModes.default,
  editorTheme: EditorThemes.dark,
  taskDescriptionLanguage: TaskDescriptionLanguages.default,
  showToastActionsAfterGame: false,
  isShowGuide: false,
};

const gameUI = createSlice({
  name: 'gameUI',
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
    updateGameUI: (state, { payload }) => {
      Object.assign(state, payload);
    },
  },
});

const { actions, reducer } = gameUI;

export { actions, persistWhitelist };

export default reducer;
