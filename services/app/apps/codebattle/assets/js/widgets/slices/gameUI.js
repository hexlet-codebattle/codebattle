import { createSlice } from '@reduxjs/toolkit';

import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const initialState = {
  followId: undefined,
  followPaused: false,
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
    followUser: (state, { payload }) => {
      state.followId = payload.followId;
      state.followPaused = false;
    },
    unfollowUser: state => {
      state.followId = undefined;
      state.followPaused = false;
    },
    togglePausedFollow: state => {
      state.followPaused = !state.followPaused;
    },
  },
});

const { actions, reducer } = gameUI;

export { actions };

export default reducer;
