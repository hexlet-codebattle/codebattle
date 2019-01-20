import React from 'react';
import { Provider } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';
import RootContainer from './containers/RootContainer';
import createStore from './lib/configureStore';
import reducers from './reducers';
import GameList from './containers/GameList';


const persistConfig = {
  key: 'root',
  storage,
};

const persistedReducer = persistReducer(persistConfig, reducers);

// TODO: put initial state from gon
const store = createStore(persistedReducer, {});

const persistor = persistStore(store);

export const Game = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <RootContainer />
    </PersistGate>
  </Provider>
);


export const Lobby = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <GameList />
    </PersistGate>
  </Provider>
);
