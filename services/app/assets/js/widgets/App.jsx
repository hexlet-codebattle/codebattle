import React from 'react';
import { Provider } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';
import { configureStore, combineReducers, getDefaultMiddleware } from '@reduxjs/toolkit';
import rollbarMiddleware from 'rollbar-redux-middleware';
import rollbar from './lib/rollbar';
import RootContainer from './containers/RootContainer';
import reducers from './slices';
import LobbyWidget from './containers/LobbyWidget';
import RatingList from './containers/RatingList';
import UserProfile from './containers/UserProfile';

const { editorUI: editorUIReducer, ...otherReducers } = reducers;

const editorUIPersistConfig = {
  key: 'editorUI',
  storage,
};

const rootReducer = combineReducers({
  editorUI: persistReducer(editorUIPersistConfig, editorUIReducer),
  ...otherReducers,
});

const rollbarRedux = rollbarMiddleware(rollbar);
// TODO: put initial state from gon
const store = configureStore({
  reducer: rootReducer,
  middleware: [
    rollbarRedux,
    ...getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['ERROR'],
      },
    }),
  ],
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
      <LobbyWidget />
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

export const UserPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <UserProfile />
    </PersistGate>
  </Provider>
);
