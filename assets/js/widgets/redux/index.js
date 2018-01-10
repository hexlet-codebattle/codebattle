/* eslint-disable global-require */
import { combineReducers } from 'redux';
import chat from '../reducers/chat';
import gameList from '../reducers/gameList';
import storeLoaded from '../reducers/store';
import user from '../reducers/user';
import executionOutput from '../reducers/executionOutput';

export default combineReducers({
  gameStatus: require('./GameRedux').reducer,
  editors: require('./EditorRedux').reducer,
  user,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
});

