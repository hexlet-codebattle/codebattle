import _ from 'lodash';
import { currentUserSelector, firstUserSelector, secondUserSelector } from './user';
import userTypes from '../config/userTypes';

export const editorsSelector = state => state.editors;

export const firstEditorSelector = (state) => {
  const userId = firstUserSelector(state).id;
  return editorsSelector(state)[userId];
};

export const secondEditorSelector = (state) => {
  const userId = secondUserSelector(state).id;
  return editorsSelector(state)[userId];
};

export const leftEditorSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const editorSelector = (currentUser.type !== userTypes.secondPlayer) ?
    firstEditorSelector :
    secondEditorSelector;
  return editorSelector(state);
};

export const rightEditorSelector = (state) => {
  const currentUser = currentUserSelector(state);
  const editorSelector = (currentUser.type === userTypes.secondPlayer) ?
    firstEditorSelector :
    secondEditorSelector;
  return editorSelector(state);
};

export const langSelector = (userId, state) =>
  _.get(editorsSelector(state), [userId, 'currentLang'], null);

