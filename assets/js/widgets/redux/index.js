/* eslint-disable global-require */
import { combineReducers } from 'redux';
import chat from '../reducers/chat';
import storeLoaded from '../reducers/store';

export default combineReducers({
  gameStatus: require('./GameRedux').reducer,
  users: require('./UserRedux').reducer,
  editors: require('./EditorRedux').reducer,
  chat,
  storeLoaded,
});

