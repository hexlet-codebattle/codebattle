/* eslint-disable global-require */
import { combineReducers } from 'redux';

export default combineReducers({
  gameStatus: require('./GameRedux').reducer,
  users: require('./UserRedux').reducer,
  editors: require('./EditorRedux').reducer,
});

