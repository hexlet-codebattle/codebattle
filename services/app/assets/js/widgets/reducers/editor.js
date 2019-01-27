import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import { defaultEditorHeight } from '../config/editorSettings';

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
};

export const makeEditorTextKey = (userId, lang) => `${userId}:${lang}`;

const getCurrentEditorHeight = (state, userId) => {
  const { [userId]: { editorHeight } } = state;
  return editorHeight || defaultEditorHeight;
};

const meta = handleActions({
  [actions.updateEditorLang](state, { payload: { userId, currentLangSlug } }) {
    return {
      ...state,
      [userId]: {
        ...state[userId],
        userId,
        currentLangSlug,
      },
    };
  },
  [actions.updateEditorText](state, { payload: { userId, langSlug } }) {
    return {
      ...state,
      [userId]: {
        ...state[userId],
        userId,
        currentLangSlug: langSlug,
      },
    };
  },
  [actions.compressEditorHeight](state, { payload: { userId } }) {
    const currentHeight = getCurrentEditorHeight(state, userId);
    const newEditorHeight = currentHeight > 100 ? currentHeight - 100 : currentHeight;
    return {
      ...state,
      [userId]: {
        ...state[userId],
        editorHeight: newEditorHeight,
      },
    };
  },
  [actions.expandEditorHeight](state, { payload: { userId } }) {
    const currentHeight = getCurrentEditorHeight(state, userId);
    return {
      ...state,
      [userId]: {
        ...state[userId],
        editorHeight: currentHeight + 100,
      },
    };
  },
}, initialState.meta);

const text = handleActions({
  [actions.updateEditorText](state, { payload: { userId, langSlug, text: editorText } }) {
    return {
      ...state,
      [makeEditorTextKey(userId, langSlug)]: editorText,
    };
  },
}, initialState.text);

export default combineReducers({
  meta,
  text,
});
