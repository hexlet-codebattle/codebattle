/* eslint-disable global-require */
import { combineReducers } from 'redux';
import chat from '../reducers/chat';
import gameList from '../reducers/gameList';
import storeLoaded from '../reducers/store';
import executionOutput from '../reducers/executionOutput';

export default combineReducers({
  gameStatus: require('./GameRedux').reducer,
  users: require('./UserRedux').reducer,
  editors: require('./EditorRedux').reducer,
  chat,
  gameList,
  storeLoaded,
  executionOutput,
});

