import React from 'react';
import { Provider } from 'react-redux';
import RootContainer from './containers/RootContainer';
import createStore from './lib/configureStore';
import reducers from './reducers';
import GameList from './containers/GameList';

// TODO: put initial state from gon
const store = createStore(reducers, {});

export const Game = () => (
  <Provider store={store}>
    <RootContainer />
  </Provider>
);


export const Lobby = () => (
  <Provider store={store}>
    <GameList />
  </Provider>
);
