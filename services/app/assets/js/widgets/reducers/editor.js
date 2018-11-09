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

const reducer = handleActions({
  [actions.updateEditorLang](state, { userId, currentLang }) {
    console.log(state)
    return {
      ...state,
      meta: '123',
      [userId]: {
        currentLang,
      },
    };
  },

  [actions.updateEditorText](state, { userId, lang, text: editorText }) {
    return {
      ...state,
      [makeEditorTextKey(userId, lang)]: editorText,
    };
  },
}, initialState);

// export default combineReducers({
//   meta,
//   text,
// });
export default reducer;
