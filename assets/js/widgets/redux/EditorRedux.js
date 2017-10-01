import _ from 'lodash';
import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import { firstUserSelector, secondUserSelector } from './UserRedux';
import { EditorTypes as Types } from './Actions';

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  editors: {
    // 1: { userId: 1, value: '' },
    // 2: { userId: 2, value: '' },
  },
});

/* ------------- Reducers ------------- */

export const updateEditor = (state, { userId, editorText }) => {
  return state.updateIn(['editors'], Immutable.merge, { [userId]: { userId, value: editorText } });
};

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, {
  [Types.UPDATE_EDITOR_DATA]: updateEditor,
});

/* ------------- Selectors ------------- */

export const editorsSelector = state => state.editors.editors;

export const firstEditorSelector = (state) => {
  const editor = _.pickBy(editorsSelector(state), { userId: firstUserSelector(state).id });
  return _.values(editor)[0];
};

export const secondEditorSelector = (state) => {
  const editor = _.pickBy(editorsSelector(state), { userId: secondUserSelector(state).id });
  return _.values(editor)[0];
};
