import React, { Suspense } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { persistStore, persistReducer, PERSIST } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import storage from 'redux-persist/lib/storage';
import rollbarMiddleware from 'rollbar-redux-middleware';

import rollbar from '@/lib/rollbar';
import machines from '@/machines';
import reducers from '@/slices';

import PageNames from './config/pageNames';

const {
  game: mainMachine,
  editor: editorMachine,
  task: taskMachine,
  spectator: spectatorMachine,
  waitingRoom: waitingRoomMachine,
} = machines;
const { gameUI: gameUIReducer, ...otherReducers } = reducers;

const gameUIPersistWhitelist = [
  'audioMuted',
  'videoMuted',
  'editorMode',
  'editorTheme',
  'streamMode',
  'followId',
  'followPaused',
  'taskDescriptionLanguage',
  'tournamentVisibleMode',
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
  middleware: getDefaultMiddleware => getDefaultMiddleware({
      serializableCheck: { ignoredActions: ['ERROR', PERSIST] },
    }).concat(rollbarRedux),
});

const persistor = persistStore(store);

const EventWidget = React.lazy(() => import('./pages/event'));
const HallOfFame = React.lazy(() => import('./pages/hallOfFamePage'));
const InvitesContainer = React.lazy(
  () => import('./components/InvitesContainer'),
);
const LobbyWidget = React.lazy(() => import('./pages/lobby'));
const OnlineContainer = React.lazy(
  () => import('./components/OnlineContainer'),
);
const RatingList = React.lazy(() => import('./pages/rating'));
const Registration = React.lazy(() => import('./pages/registration'));
const RoomWidget = React.lazy(() => import('./pages/RoomWidget'));
const Stream = React.lazy(() => import('./pages/stream/StreamWidget'));
const Tournament = React.lazy(() => import('./pages/tournament'));
const TournamentAdmin = React.lazy(
  () => import('./pages/tournament/TournamentAdminWidget'),
);
const TournamentPlayer = React.lazy(() => import('./pages/tournamentPlayer'));
const TournamentsSchedule = React.lazy(() => import('./pages/schedule'));
const UserProfile = React.lazy(() => import('./pages/profile'));
const UserSettings = React.lazy(() => import('./pages/settings'));

export const Online = () => (
  <Provider store={store}>
    <OnlineContainer />
  </Provider>
);

export const Invites = () => (
  <Provider store={store}>
    <InvitesContainer />
  </Provider>
);

export const Game = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <RoomWidget
            pageName={PageNames.game}
            mainMachine={mainMachine}
            waitingRoomMachine={waitingRoomMachine}
            taskMachine={taskMachine}
            editorMachine={editorMachine}
          />
        </NiceModal.Provider>
      </Suspense>
    </PersistGate>
  </Provider>
);

export const Builder = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <RoomWidget
            pageName={PageNames.builder}
            mainMachine={mainMachine}
            waitingRoomMachine={waitingRoomMachine}
            taskMachine={taskMachine}
            editorMachine={editorMachine}
          />
        </NiceModal.Provider>
      </Suspense>
    </PersistGate>
  </Provider>
);

export const Lobby = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <LobbyWidget />
        </NiceModal.Provider>
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

export const TournamentsSchedulePage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <TournamentsSchedule />
        </NiceModal.Provider>
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
      <Suspense>{/* <Stairway /> */}</Suspense>
    </PersistGate>
  </Provider>
);

export const TournamentPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <Tournament waitingRoomMachine={waitingRoomMachine} />
      </Suspense>
    </PersistGate>
  </Provider>
);
export const TournamentAdminPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <TournamentAdmin waitingRoomMachine={waitingRoomMachine} />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const EventPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <EventWidget />
        </NiceModal.Provider>
      </Suspense>
    </PersistGate>
  </Provider>
);

export const TournamentPlayerPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <NiceModal.Provider>
          <TournamentPlayer
            spectatorMachine={spectatorMachine}
            waitingRoomMachine={waitingRoomMachine}
          />
        </NiceModal.Provider>
      </Suspense>
    </PersistGate>
  </Provider>
);

export const StreamPage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <Stream
          mainMachine={mainMachine}
          waitingRoomMachine={waitingRoomMachine}
          taskMachine={taskMachine}
          editorMachine={editorMachine}
        />
      </Suspense>
    </PersistGate>
  </Provider>
);

export const HallOfFamePage = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>
        <HallOfFame />
      </Suspense>
    </PersistGate>
  </Provider>
);
