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

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import {
  renderGameWidget,
  renderLobby,
  renderHeatmapWidget,
  renderUsersRating,
  renderUserPage,
  renderSettingPage,
} from './widgets';
import renderExtensionPopup from './widgets/components/ExtensionPopup';

const Hooks = {
  NewChatMessage: {
    mounted() {
      this.el.scrollTop = this.el.scrollHeight;
    },
    updated() {
      this.el.scrollTop = this.el.scrollHeight;
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

const extension = document.getElementById('extension');
const gameWidgetRoot = document.getElementById('game-widget-root');
const heatmapRoot = document.getElementById('heatmap-root');
const gameListRoot = document.getElementById('game-list');
const ratingList = document.getElementById('rating-list');
const userPageRoot = document.getElementById('user-page-root');
const settingsRoot = document.getElementById('settings');

if (extension) {
  renderExtensionPopup(extension);
}

if (gameWidgetRoot) {
  renderGameWidget(gameWidgetRoot);
}

if (heatmapRoot) {
  renderHeatmapWidget(heatmapRoot);
}

if (gameListRoot) {
  renderLobby(gameListRoot);
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
