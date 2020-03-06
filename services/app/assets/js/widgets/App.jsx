import React from 'react';
import { Provider } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import RootContainer from './containers/RootContainer';
import reducers from './reducers';
import GameList from './containers/GameList';
import RatingList from './containers/RatingList';
import LangPieChart from './containers/LangPieChart';

const { editorUI: editorUIReducer, ...otherReducers } = reducers;

const editorUIPersistConfig = {
  key: 'editorUI',
  storage,
};

const rootReducer = combineReducers({
  editorUI: persistReducer(editorUIPersistConfig, editorUIReducer),
  ...otherReducers,
});

// TODO: put initial state from gon
const store = configureStore({
  reducer: rootReducer,
});

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

export const UsersRating = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <RatingList />
    </PersistGate>
  </Provider>
);

export const Chart = () => (
  <Provider store={store}>
      <LangPieChart />
  </Provider>
);
