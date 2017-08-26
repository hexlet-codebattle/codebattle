/* eslint-disable global-require */
import { combineReducers } from 'redux';

export default combineReducers({
  users: require('./UserRedux').reducer,
  editors: require('./EditorRedux').reducer,
});

