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
import '@fortawesome/fontawesome-free/js/all';
import 'bootstrap';

import NProgress from 'nprogress';
import { Socket } from 'phoenix';
import { LiveSocket } from 'phoenix_live_view';
import { inspect } from '@xstate/inspect';

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import {
  renderInvitesWidget,
  renderGameWidget,
  renderLobby,
  renderHeatmapWidget,
  renderUsersRating,
  renderUserPage,
  renderSettingPage,
  renderRegistrationPage,
  renderStairwayGamePage,
  renderTournamentPage,
} from './widgets';
import renderExtensionPopup from './widgets/components/ExtensionPopup';

if (process.env.NODE_ENV === 'development') {
  inspect({
    iframe: () => document.querySelector('.xstate'),
  });
}

const Hooks = {
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
        this.el.value = value;
      });
    },
  },
};
const csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute('content');
const liveSocket = new LiveSocket('/live', Socket, {
  hooks: Hooks,
  params: { _csrf_token: csrfToken },
});

window.addEventListener('phx:page-loading-start', _info => NProgress.start());
window.addEventListener('phx:page-loading-stop', _info => NProgress.done());

liveSocket.connect();

const invitesRoot = document.getElementById('invites-root');
const extension = document.getElementById('extension');
const gameWidgetRoot = document.getElementById('game-widget-root');
const heatmapRoot = document.getElementById('heatmap-root');
const lobbyRoot = document.getElementById('lobby-root');
const ratingList = document.getElementById('rating-list');
const userPageRoot = document.getElementById('user-page-root');
const settingsRoot = document.getElementById('settings');
const registrationRoot = document.getElementById('registration');
const stairwayGameRoot = document.getElementById('stairway-game-root');
const tournamentRoot = document.getElementById('tournament-root');

if (invitesRoot) {
  renderInvitesWidget(invitesRoot);
}

if (extension) {
  renderExtensionPopup(extension);
}

if (gameWidgetRoot) {
  renderGameWidget(gameWidgetRoot);
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

if (stairwayGameRoot) {
  renderStairwayGamePage(stairwayGameRoot);
}

if (tournamentRoot) {
  renderTournamentPage(tournamentRoot);
}
