import React from 'react';
import { Provider } from 'react-redux';
import RootContainer from './containers/RootContainer';
import createStore from './redux/CreateStore';
import getVar from '../lib/phxVariables';
import { UserActions } from './redux/Actions';

const startup = (dispatch) => {
  const userId = getVar('user_id');

  console.log('AAAHEHF!!!', userId)
  dispatch(UserActions.setCurrentUser(userId));
}

const store = createStore();

startup(store.dispatch);

export default () => (
  <Provider store={store}>
    <RootContainer />
  </Provider>
);

