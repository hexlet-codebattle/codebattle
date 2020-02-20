import { createReducer, combineReducers } from '@reduxjs/toolkit';
import * as actions from '../actions';
import defaultEditorHeight from '../config/editorSettings';

// example
// meta: {
//   2: { userId: 2, currentLangSlug: null },
// }
// text: {
//   [2:haskell] : 'text'
// },

const initialState = {
  meta: {},
  text: {},
  textPlaybook: {},
};

export const makeEditorTextKey = (userId, lang) => `${userId}:${lang}`;

const getCurrentEditorHeight = (state, userId) => {
  const { [userId]: { editorHeight } } = state;
  return editorHeight || defaultEditorHeight;
};

const meta = createReducer(initialState.meta, {
  [actions.updateEditorLang](state, { payload: { userId, currentLangSlug } }) {
    state[userId] = {
      ...state[userId],
      userId,
      currentLangSlug,
    };
  },
  [actions.updateEditorTextPlaybook](state, { payload: { userId, langSlug } }) {
    state[userId] = {
      ...state[userId],
      userId,
      currentLangSlug: langSlug,
    };
  },

  [actions.updateEditorText](state, { payload: { userId, langSlug } }) {
    state[userId] = {
      ...state[userId],
      userId,
      currentLangSlug: langSlug,
    };
  },

  [actions.compressEditorHeight](state, { payload: { userId } }) {
    const currentHeight = getCurrentEditorHeight(state, userId);
    const newEditorHeight = currentHeight > 100 ? currentHeight - 100 : currentHeight;
    state[userId] = {
      ...state[userId],
      editorHeight: newEditorHeight,
    };
  },

  [actions.expandEditorHeight](state, { payload: { userId } }) {
    const currentHeight = getCurrentEditorHeight(state, userId);
    state[userId] = {
      ...state[userId],
      editorHeight: currentHeight + 100,
    };
  },
});

const text = createReducer(initialState.text, {
  [actions.updateEditorText](state, { payload: { userId, langSlug, editorText } }) {
    state[makeEditorTextKey(userId, langSlug)] = editorText;
  },
});

const textPlaybook = createReducer(initialState.textPlaybook, {
  [actions.updateEditorTextPlaybook](state, { payload: { userId, editorText } }) {
    state[userId] = editorText;
  },
});

export default combineReducers({
  meta,
  text,
  textPlaybook,
});
