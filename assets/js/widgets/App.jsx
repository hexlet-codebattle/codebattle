import React from 'react';
import { Provider } from 'react-redux';
import RootContainer from './containers/RootContainer';
import createStore from './redux/CreateStore';

const store = createStore();

export default () => (
  <Provider store={store}>
    <RootContainer />
  </Provider>
);

