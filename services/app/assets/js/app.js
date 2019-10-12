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
import 'phoenix_html';
import '@babel/polyfill';
import '@fortawesome/fontawesome-free/js/all';
import 'bootstrap';
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import {
  renderGameWidget, renderLobby, renderHeatmapWidget, renderUsersRating,
} from './widgets';

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
const liveSocket = new LiveSocket('/live', Socket, { hooks: Hooks });
liveSocket.connect();

const gameWidgetRoot = document.getElementById('game-widget-root');
const heatmapRoot = document.getElementById('heatmap-root');
const gameListRoot = document.getElementById('game-list');
const ratingList = document.getElementById('rating-list');

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
