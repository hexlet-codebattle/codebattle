import React, { Suspense } from "react";

import NiceModal from "@ebay/nice-modal-react";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { persistStore, persistReducer, PERSIST } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import storage from "redux-persist/lib/storage";

import machines from "@/machines";
import reducers from "@/slices";

import PageNames from "./config/pageNames";

const {
  game: mainMachine,
  editor: editorMachine,
  task: taskMachine,
  spectator: spectatorMachine,
} = machines;
const { gameUI: gameUIReducer, ...otherReducers } = reducers;

const gameUIPersistWhitelist = [
  "audioMuted",
  "videoMuted",
  "editorMode",
  "editorTheme",
  "streamMode",
  "followId",
  "followPaused",
  "taskDescriptionLanguage",
  "tournamentVisibleMode",
];

const gameUIPersistConfig = {
  key: "gameUI",
  whitelist: gameUIPersistWhitelist,
  storage,
};

const rootReducer = combineReducers({
  gameUI: persistReducer(gameUIPersistConfig, gameUIReducer),
  ...otherReducers,
});

// TODO: put initial state from gon
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: ["ERROR", PERSIST] },
    }),
});

const persistor = persistStore(store);

const EventWidget = React.lazy(() => import("./pages/event"));
const HallOfFame = React.lazy(() => import("./pages/hallOfFamePage"));
const Seasons = React.lazy(() => import("./pages/seasonsPage"));
const SeasonShow = React.lazy(() => import("./pages/seasonsPage/SeasonShowPage"));
const InvitesContainer = React.lazy(() => import("./components/InvitesContainer"));
const LobbyWidget = React.lazy(() => import("./pages/lobby"));
const OnlineContainer = React.lazy(() => import("./components/OnlineContainer"));
const RatingList = React.lazy(() => import("./pages/rating"));
const Registration = React.lazy(() => import("./pages/registration"));
const RoomWidget = React.lazy(() => import("./pages/RoomWidget"));
const ThreejsGamePage = React.lazy(() => import("./pages/game/ThreejsGamePage"));
const Stream = React.lazy(() => import("./pages/stream/StreamWidget"));
const Tournament = React.lazy(() => import("./pages/tournament"));
const TournamentAdmin = React.lazy(() => import("./pages/tournament/TournamentAdminWidget"));
const TournamentEdit = React.lazy(() => import("./pages/tournament/EditTournament"));
const TournamentPlayer = React.lazy(() => import("./pages/tournamentPlayer"));
const TournamentsSchedule = React.lazy(() => import("./pages/schedule"));
const UserProfile = React.lazy(() => import("./pages/profile"));
const UserSettings = React.lazy(() => import("./pages/settings"));

export function Online() {
  return (
    <Provider store={store}>
      <OnlineContainer />
    </Provider>
  );
}

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
          <NiceModal.Provider>
            <RoomWidget
              pageName={PageNames.game}
              mainMachine={mainMachine}
              taskMachine={taskMachine}
              editorMachine={editorMachine}
            />
          </NiceModal.Provider>
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function GameThreejsPage() {
  return (
    <Provider store={store}>
      <Suspense>
        <ThreejsGamePage />
      </Suspense>
    </Provider>
  );
}

export function Builder() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <NiceModal.Provider>
            <RoomWidget
              pageName={PageNames.builder}
              mainMachine={mainMachine}
              taskMachine={taskMachine}
              editorMachine={editorMachine}
            />
          </NiceModal.Provider>
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
          <NiceModal.Provider>
            <LobbyWidget />
          </NiceModal.Provider>
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

export function TournamentsSchedulePage() {
  return (
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

export function TournamentEditPage() {
  const container = document.getElementById("tournament-edit-root");
  const tournamentId = container?.dataset?.tournamentId;
  const taskPackNames = JSON.parse(container?.dataset?.taskPackNames || "[]");
  const userTimezone = container?.dataset?.userTimezone || "UTC";

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <TournamentEdit
            tournamentId={tournamentId}
            taskPackNames={taskPackNames}
            userTimezone={userTimezone}
          />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function TournamentAdminPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <TournamentAdmin />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function EventPage() {
  return (
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
}

export function TournamentPlayerPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <NiceModal.Provider>
            <TournamentPlayer spectatorMachine={spectatorMachine} />
          </NiceModal.Provider>
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function StreamPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <Stream
            mainMachine={mainMachine}
            taskMachine={taskMachine}
            editorMachine={editorMachine}
          />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function HallOfFamePage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <HallOfFame />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function SeasonsPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <Seasons />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

export function SeasonShowPage() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Suspense>
          <SeasonShow />
        </Suspense>
      </PersistGate>
    </Provider>
  );
}
