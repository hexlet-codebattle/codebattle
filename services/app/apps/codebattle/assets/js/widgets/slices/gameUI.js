import { createSlice } from '@reduxjs/toolkit';

import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

const initialState = {
  followId: undefined,
  followPaused: false,
  streamMode: false,
  tournamentVisibleMode: 'full', // 'full', 'without_info_and_controls'
  editorMode: editorModes.default,
  editorTheme: editorThemes.dark,
  taskDescriptionLanguage: taskDescriptionLanguages.default,
  showToastActionsAfterGame: false,
  isShowGuide: false,
  showVideoConferencePanel: false,
  videoMute: true,
  audioMute: true,
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
    toggleStreamMode: state => {
      state.streamMode = !state.streamMode;
    },
    toggleShowVideoConferencePanel: state => {
      state.showVideoConferencePanel = !state.showVideoConferencePanel;
    },
    setAudioMute: (state, payload) => {
      state.audioMute = payload;
    },
    setVideoMute: (state, payload) => {
      state.videoMute = payload;
    },
  },
});

const { actions, reducer } = gameUI;

export { actions };

export default reducer;
