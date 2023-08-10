import React, { Suspense } from 'react';
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
import reducers from './slices';

import machines from './machines';

const { game: mainMachine, editor: editorMachine, task: taskMachine } = machines;
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

const InvitesContainer = React.lazy(() => import('./components/InvitesContainer'));
const GameRoomWidget = React.lazy(() => import('./pages/GameRoomWidget'));
const LobbyWidget = React.lazy(() => import('./pages/lobby'));
const RatingList = React.lazy(() => import('./pages/rating'));
const UserSettings = React.lazy(() => import('./pages/settings'));
const UserProfile = React.lazy(() => import('./pages/profile'));
const Registration = React.lazy(() => import('./pages/registration'));
const Tournament = React.lazy(() => import('./pages/tournament').Tournament);
const Stairway = React.lazy(() => import('./pages/tournament').Stairway);

export const Invites = () => (
  <Provider store={store}>
    <InvitesContainer />
  </Provider>
);

export const Game = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <GameRoomWidget
          pageName="game"
          mainMachine={mainMachine}
          taskMachine={taskMachine}
          editorMachine={editorMachine}
        />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const Builder = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <GameRoomWidget
          pageName="builder"
          mainMachine={mainMachine}
          taskMachine={taskMachine}
          editorMachine={editorMachine}
        />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const Lobby = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <LobbyWidget />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const UsersRating = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <RatingList />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const UserPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <UserProfile />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const SettingsPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <UserSettings />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const RegistrationPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <Registration />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const StairwayGamePage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <Stairway />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const TournamentPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <Tournament />
      </Suspense>
    </PersistGate>
  </Provider>
);
