/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

// Brunch automatically concatenates all files in your
// watched paths. Those paths can be configured at
// config.paths.watched in "brunch-config.js".
//
// However, those files will only be executed if
// explicitly imported. The only exception are files
// in vendor, which are never wrapped in imports and
// therefore are always executed.

// Import dependencies
//
// If you no longer want to use a dependency, remember
// to also remove its path from "config.paths.watched".
import 'core-js/stable';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'regenerator-runtime/runtime';
import 'phoenix_html';
import './fontawesome';
// ../css/style.scss is imported via vite config entry points
import 'bootstrap';

// Import static assets for cache busting (adds them to Vite manifest)
import './staticAssets';
import './pwa';
import { initializeInertiaApp } from './inertia';

import NProgress from 'nprogress';
import { Socket } from 'phoenix';
import { LiveSocket, type Hook } from 'phoenix_live_view';

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import './widgets/lib/sentry';
import {
  renderEventPage,
  renderGroupTournamentPage,
  renderGameMlPage,
  renderGameThreejsPage,
  renderGameWidget,
  renderHeatmapWidget,
  renderInvitesWidget,
  renderMainChannelWidget,
  renderLobby,
  renderOnlineWidget,
  renderRegistrationPage,
  renderSettingPage,
  renderTournamentThreejsStreamPage,
  renderTournamentStreamAdminPage,
  renderTournamentAdminPage,
  renderTournamentPage,
  renderTournamentPlayerPage,
  renderUserPage,
  renderUsersRating,
  renderAdminPage,
} from './widgets';

// NOTE: the xstate v4 iframe inspector (`@xstate/inspect`) was removed with the
// xstate v5 upgrade — it is not compatible with v5. To restore dev inspection,
// adopt `@statelyai/inspect` (`createBrowserInspector`) and pass its `inspect`
// handler to the actors created in `useGameRoomMachine` / `EditorContainer`.

const Hooks: Record<string, Hook> = {
  NewChatMessage: {
    mounted() {
      this.el.scrollTop = this.el.scrollHeight;
    },
    updated() {
      this.el.scrollTop = this.el.scrollHeight;
    },
  },
  TournamentChatInput: {
    mounted() {
      this.handleEvent('clear', ({ value }) => {
        (this.el as HTMLInputElement).value = value;
      });
    },
  },
};
const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;

if (!csrfToken) {
  throw new Error('CSRF token not found');
}

// Legacy React actions use phoenix_html's `data-csrf` convention. Inertia pages
// no longer render the old per-page script that populated this global, so keep
// it synchronized with the token provided by the shared document layout.
window.csrf_token = csrfToken;

const liveSocket = new LiveSocket('/live', Socket, {
  hooks: Hooks,
  params: {
    _csrf_token: csrfToken,
    locale: Intl.NumberFormat().resolvedOptions().locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});

window.addEventListener('phx:page-loading-start', (_info) => NProgress.start());
window.addEventListener('phx:page-loading-stop', (_info) => NProgress.done());

liveSocket.connect();

initializeInertiaApp();

const gameWidgetRoot = document.getElementById('game-widget-root');
const gameMlRoot = document.getElementById('game-ml-root');
const gameThreejsRoot = document.getElementById('game-threejs-root');
const heatmapRoot = document.getElementById('heatmap-root');
const onlineRoot = document.getElementById('online-root');
const invitesRoot = document.getElementById('invites-root');
const mainChannelRoot = document.getElementById('main-channel-root');
const tournamentThreejsStreamRoot = document.getElementById('tournament-threejs-stream-root');
const tournamentStreamAdminRoot = document.getElementById('tournament-stream-admin-root');
const lobbyRoot = document.getElementById('lobby-root');
const ratingList = document.getElementById('rating-list');
const registrationRoot = document.getElementById('registration');
const settingsRoot = document.getElementById('settings');
const tournamentPlayerRoot = document.getElementById('tournament-player-root');
const tournamentRoot = document.getElementById('tournament-root');
const adminTournamentRoot = document.getElementById('tournament-admin-root');
const eventWidgetRoot = document.getElementById('event-widget');
const groupTournamentRoot = document.getElementById('group-tournament-root');
const userPageRoot = document.getElementById('user-page-root');
const adminConnectionsRoot = document.getElementById('admin-connections-root');

if (mainChannelRoot) {
  renderMainChannelWidget(mainChannelRoot);
}

if (adminConnectionsRoot) {
  renderAdminPage(adminConnectionsRoot);
}

if (gameWidgetRoot) {
  renderGameWidget(gameWidgetRoot);
}

if (gameThreejsRoot) {
  renderGameThreejsPage(gameThreejsRoot);
}

if (gameMlRoot) {
  renderGameMlPage(gameMlRoot);
}

if (heatmapRoot) {
  renderHeatmapWidget(heatmapRoot);
}

if (lobbyRoot) {
  renderLobby(lobbyRoot);
}

if (ratingList) {
  renderUsersRating(ratingList);
}

if (userPageRoot) {
  renderUserPage(userPageRoot);
}

if (settingsRoot) {
  renderSettingPage(settingsRoot);
}

if (registrationRoot) {
  renderRegistrationPage(registrationRoot);
}

if (tournamentPlayerRoot) {
  renderTournamentPlayerPage(tournamentPlayerRoot);
}

if (tournamentRoot) {
  renderTournamentPage(tournamentRoot);
}

if (adminTournamentRoot) {
  renderTournamentAdminPage(adminTournamentRoot);
}

if (eventWidgetRoot) {
  renderEventPage(eventWidgetRoot);
}

if (groupTournamentRoot) {
  renderGroupTournamentPage(groupTournamentRoot);
}

if (onlineRoot) {
  renderOnlineWidget(onlineRoot);
}

if (invitesRoot) {
  renderInvitesWidget(invitesRoot);
}

if (tournamentThreejsStreamRoot) {
  renderTournamentThreejsStreamPage(tournamentThreejsStreamRoot);
}

if (tournamentStreamAdminRoot) {
  renderTournamentStreamAdminPage(tournamentStreamAdminRoot);
}
