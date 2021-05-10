import React from 'react';
import { Provider } from 'react-redux';
import { persistStore, persistReducer, PERSIST } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';
import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import rollbarMiddleware from 'rollbar-redux-middleware';
import rollbar from './lib/rollbar';
import InvitesContainer from './containers/InvitesContainer';
import RootContainer from './containers/RootContainer';
import reducers from './slices';
import LobbyWidget from './containers/LobbyWidget';
import RatingList from './containers/RatingList';
import UserProfile from './containers/UserProfile';
import UserSettings from './containers/UserSettings';
import Registration from './containers/Registration';

const { gameUI: gameUIReducer, ...otherReducers } = reducers;

const gameUIPersistWhitelist = [
  'editorMode',
  'editorTheme',
  'taskDescriptionLanguage',
];

const gameUIPersistConfig = {
  key: 'gameUI',
  whitelist: gameUIPersistWhitelist,
  storage,
};

const rootReducer = combineReducers({
  gameUI: persistReducer(gameUIPersistConfig, gameUIReducer),
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
        ignoredActions: ['ERROR', PERSIST],
      },
    }),
  ],
});

const persistor = persistStore(store);

export const Invites = () => (
  <Provider store={store}>
    <InvitesContainer />
  </Provider>
);

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

export const SettingsPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <UserSettings />
    </PersistGate>
  </Provider>
);

export const RegistrationPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Registration />
    </PersistGate>
  </Provider>
);
