import { combineReducers, createSlice } from '@reduxjs/toolkit';

import defaultEditorHeight from '../config/editorSettings';
import { makeEditorTextKey } from '../utils/gameRoom';

import initial from './initial';

const getCurrentEditorHeight = (state, userId) => {
  const {
    [userId]: { editorHeight },
  } = state;
  return editorHeight || defaultEditorHeight;
};

const meta = createSlice({
  name: 'meta',
  initialState: initial.editor.meta,
  reducers: {
    updateEditorLang: (state, { payload: { currentLangSlug, userId } }) => {
      state[userId] = {
        ...state[userId],
        userId,
        currentLangSlug,
      };
    },
    updateEditorTextHistory: (state, { payload: { langSlug, userId } }) => {
      state[userId] = {
        ...state[userId],
        userId,
        historyCurrentLangSlug: langSlug,
      };
    },
    updateEditorText: (state, { payload: { langSlug, userId } }) => {
      state[userId] = {
        ...state[userId],
        userId,
        currentLangSlug: langSlug,
      };
    },
    compressEditorHeight: (state, { payload: { userId } }) => {
      const currentHeight = getCurrentEditorHeight(state, userId);
      const newEditorHeight = currentHeight > 100 ? currentHeight - 100 : currentHeight;
      state[userId] = {
        ...state[userId],
        editorHeight: newEditorHeight,
      };
    },
    expandEditorHeight: (state, { payload: { userId } }) => {
      const currentHeight = getCurrentEditorHeight(state, userId);
      state[userId] = {
        ...state[userId],
        editorHeight: currentHeight + 100,
      };
    },
  },
});

const text = createSlice({
  name: 'text',
  initialState: initial.editor.text,
  extraReducers: {
    [meta.actions.updateEditorText]: (state, { payload: { editorText, langSlug, userId } }) => {
      state[makeEditorTextKey(userId, langSlug)] = editorText;
    },
  },
});

const textHistory = createSlice({
  name: 'textHistory',
  initialState: initial.editor.textHistory,
  extraReducers: {
    [meta.actions.updateEditorTextHistory]: (state, { payload: { editorText, userId } }) => {
      state[userId] = editorText;
    },
  },
});

const langs = createSlice({
  name: 'langs',
  initialState: initial.editor.langs,
  reducers: {
    setLangs: (state, { payload: { langs: newLangs } }) => {
      state = newLangs;
    },
  },
});

const langsHistory = createSlice({
  name: 'langsHistory',
  initialState: initial.editor.langsHistory,
  extraReducers: {
    [meta.actions.updateEditorTextHistory]: (state, { payload: { langSlug, userId } }) => {
      state[userId] = langSlug;
    },
  },
});

export const actions = {
  ...text.actions,
  ...textHistory.actions,
  ...langs.actions,
  ...meta.actions,
  ...langsHistory.actions,
};

export default combineReducers({
  meta: meta.reducer,
  text: text.reducer,
  textHistory: textHistory.reducer,
  langs: langs.reducer,
  langsHistory: langsHistory.reducer,
});
