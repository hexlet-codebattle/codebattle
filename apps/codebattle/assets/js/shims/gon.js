// assets/js/shims/gon.js
/* global globalThis */
const Gon = (globalThis && (globalThis.Gon || globalThis.gon)) || null;

if (!Gon) {
  // Helpful in dev if the server didn't inject it
  console.warn("[gon shim] window.Gon is not defined");
}

export default Gon;
export const gon = Gon;
