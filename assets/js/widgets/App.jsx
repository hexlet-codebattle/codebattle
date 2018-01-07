import React from 'react';
import { Provider } from 'react-redux';
import RootContainer from './containers/RootContainer';
import createStore from './redux/CreateStore';
import GameList from './containers/GameList';

const store = createStore();

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
