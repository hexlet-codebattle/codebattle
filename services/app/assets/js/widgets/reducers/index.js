import { combineReducers } from 'redux';
import chat from './chat';
import gameList from './gameList';
import storeLoaded from './store';
import user from './user';
import executionOutput from './executionOutput';
import editor from './editor';
import game from './game';

export default combineReducers({
  game,
  editor,
  user,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
});
export { makeEditorTextKey } from './editor';
