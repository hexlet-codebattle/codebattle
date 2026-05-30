// import 'core-js/stable';
// eslint-disable-next-line import/no-extraneous-dependencies
// import 'regenerator-runtime/runtime';
// import 'phoenix_html';
// import '@fortawesome/fontawesome-free/js/all';
// import 'bootstrap';

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import "core-js/stable";
import "bootstrap";
import "phoenix_html";
import { renderEventPage, renderMainChannelWidget } from "./widgets";

const eventWidgetRoot = document.getElementById("event-widget");
const mainChannelRoot = document.getElementById("main-channel-root");

if (mainChannelRoot) {
  renderMainChannelWidget(mainChannelRoot);
}

if (eventWidgetRoot) {
  renderEventPage(eventWidgetRoot);
}
