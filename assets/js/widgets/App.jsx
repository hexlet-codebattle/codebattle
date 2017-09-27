import React from 'react';
import { Provider } from 'react-redux';
import RootContainer from './containers/RootContainer';
import createStore from './redux/CreateStore';
import getVar from '../lib/phxVariables';
import { UserActions } from './redux/Actions';

const getStartup = dispatch => () => {
  const userId = getVar('user_id');
  dispatch(UserActions.setCurrentUser(userId));
};

const store = createStore();

export default () => (
  <Provider store={store}>
    <RootContainer startup={getStartup(store.dispatch)} />
  </Provider>
);

