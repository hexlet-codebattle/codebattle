import { createSlice } from '@reduxjs/toolkit';
import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const initialState = {
  editorMode: editorModes.default,
  editorTheme: editorThemes.dark,
  taskDescriptionLanguage: taskDescriptionLanguages.default,
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

export { actions };

export default reducer;
