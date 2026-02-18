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
import { renderEventPage } from "./widgets";

const eventWidgetRoot = document.getElementById("event-widget");

if (eventWidgetRoot) {
  renderEventPage(eventWidgetRoot);
}
