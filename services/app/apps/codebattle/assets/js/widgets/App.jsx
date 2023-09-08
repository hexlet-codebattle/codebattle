import React, { Suspense } from 'react';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { persistStore, persistReducer, PERSIST } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import storage from 'redux-persist/lib/storage';
import rollbarMiddleware from 'rollbar-redux-middleware';

import rollbar from '@/lib/rollbar';
import machines from '@/machines';
import reducers from '@/slices';

const { editor: editorMachine, game: mainMachine, task: taskMachine } = machines;
const { gameUI: gameUIReducer, ...otherReducers } = reducers;

const gameUIPersistWhitelist = ['editorMode', 'editorTheme', 'taskDescriptionLanguage'];

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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: ['ERROR', PERSIST] },
    }).concat(rollbarRedux),
});

const persistor = persistStore(store);

const InvitesContainer = React.lazy(() => import('./components/InvitesContainer'));
const GameRoomWidget = React.lazy(() => import('./pages/GameRoomWidget'));
const LobbyWidget = React.lazy(() => import('./pages/lobby'));
const RatingList = React.lazy(() => import('./pages/rating'));
const UserSettings = React.lazy(() => import('./pages/settings'));
const UserProfile = React.lazy(() => import('./pages/profile'));
const Registration = React.lazy(() => import('./pages/registration'));
const Tournament = React.lazy(() => import('./pages/tournament'));

export function Invites() {
  return (
    <Provider store={store}>
      <InvitesContainer />
    </Provider>
  );
}

export function Game() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <GameRoomWidget
            editorMachine={editorMachine}
            mainMachine={mainMachine}
            pageName="game"
            taskMachine={taskMachine}
          />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function Builder() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <GameRoomWidget
            editorMachine={editorMachine}
            mainMachine={mainMachine}
            pageName="builder"
            taskMachine={taskMachine}
          />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function Lobby() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <LobbyWidget />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function UsersRating() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <RatingList />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function UserPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <UserProfile />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function SettingsPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <UserSettings />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function RegistrationPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <Registration />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function StairwayGamePage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>{/* <Stairway /> */}</Suspense>
      </PersistGate>
    </Provider>
  );
}

export function TournamentPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <Tournament />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}
