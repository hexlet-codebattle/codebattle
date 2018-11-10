import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';

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

const meta = handleActions({
  [actions.updateEditorLang](state, { payload: { userId, currentLangSlug } }) {
    return {
      ...state,
      [userId]: {
        userId,
        currentLangSlug,
      },
    };
  },
  [actions.updateEditorText](state, { payload: { userId, langSlug } }) {
    return {
      ...state,
      [userId]: {
        userId,
        currentLangSlug: langSlug,
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
