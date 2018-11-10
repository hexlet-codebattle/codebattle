import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';

// example
// meta: {
//   2: { userId: 2, currentLang: null },
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
  [actions.updateEditorLang](state, { payload: { userId, currentLang } }) {
    return {
      ...state,
      [userId]: {
        userId,
        currentLang,
      },
    };
  },
  [actions.updateEditorText](state, { payload: { userId, langSlug } }) {
    return {
      ...state,
      [userId]: {
        userId,
        currentLang: langSlug,
      },
    };
  },
}, initialState.meta);

const text = handleActions({
  [actions.updateEditorText](state, { payload: { userId, langSlug, text: editorText } }) {
    console.log({ userId, langSlug, text: editorText });
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
