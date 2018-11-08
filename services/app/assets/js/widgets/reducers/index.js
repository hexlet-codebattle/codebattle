import { combineReducers } from 'redux';
import chat from './chat';
import gameList from './gameList';
import storeLoaded from './store';
import user from './user';
import executionOutput from './executionOutput';
import editors from './editor';
import game from './game';

export default combineReducers({
  game,
  editors,
  user,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
});
