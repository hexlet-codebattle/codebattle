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
  [actions.updateEditorLang](state, { userId, currentLang }) {
    return {
      ...state,
      [userId]: {
        currentLang,
      },
    };
  },
}, initialState.meta);

const text = handleActions({
  [actions.updateEditorText](state, { userId, lang, text: editorText }) {
    return {
      ...state,
      [makeEditorTextKey(userId, lang)]: editorText,
    };
  },
}, initialState.text);

export default combineReducers({
  meta,
  text,
});
