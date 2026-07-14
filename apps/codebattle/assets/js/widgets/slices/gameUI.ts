import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import editorModes from '../config/editorModes';
import editorThemes from '../config/editorThemes';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';

export interface GameUIState {
  followId: number | undefined;
  followPaused: boolean;
  streamMode: boolean;
  tournamentVisibleMode: string;
  editorMode: string;
  editorTheme: string;
  taskDescriptionLanguage: string;
  showToastActionsAfterGame: boolean;
  isShowGuide: boolean;
  videoMuted: boolean;
  audioMuted: boolean;
  audioAvailable: boolean;
  videoAvailable: boolean;
  inMainDraw?: boolean;
}

const initialState: GameUIState = {
  followId: undefined,
  followPaused: false,
  streamMode: false,
  tournamentVisibleMode: 'full', // 'full', 'without_info_and_controls'
  editorMode: editorModes.default,
  editorTheme: editorThemes.dark,
  taskDescriptionLanguage: taskDescriptionLanguages.default,
  showToastActionsAfterGame: false,
  isShowGuide: false,
  videoMuted: false,
  audioMuted: false,
  audioAvailable: false,
  videoAvailable: false,
};

const gameUI = createSlice({
  name: 'gameUI',
  initialState,
  reducers: {
    setEditorsMode: (state, { payload }: PayloadAction<string>) => {
      state.editorMode = payload;
    },
    switchEditorsTheme: (state, { payload }: PayloadAction<string>) => {
      state.editorTheme = payload;
    },
    setTaskDescriptionLanguage: (state, { payload }: PayloadAction<string>) => {
      state.taskDescriptionLanguage = payload;
    },
    updateGameUI: (state, { payload }: PayloadAction<Partial<GameUIState>>) => {
      Object.assign(state, payload);
    },
    followUser: (state, { payload }: PayloadAction<{ followId: number }>) => {
      state.followId = payload.followId;
      state.followPaused = false;
    },
    unfollowUser: (state) => {
      state.followId = undefined;
      state.followPaused = false;
    },
    togglePausedFollow: (state) => {
      state.followPaused = !state.followPaused;
    },
    toggleStreamMode: (state) => {
      state.streamMode = !state.streamMode;
    },
    setInMainDraw: (state, { payload }: PayloadAction<boolean>) => {
      state.inMainDraw = payload;
    },
    setAudioAvailable: (state, { payload }: PayloadAction<boolean>) => {
      state.audioAvailable = payload;
    },
    setVideoAvailable: (state, { payload }: PayloadAction<boolean>) => {
      state.videoAvailable = payload;
    },
  },
});

const { actions, reducer } = gameUI;

export { actions };

export default reducer;
