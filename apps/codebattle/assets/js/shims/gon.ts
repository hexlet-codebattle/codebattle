// assets/js/shims/gon.ts
/* global globalThis */
interface GonApi {
  // Server-injected assets are intentionally dynamic at this boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAsset<T = any>(name: string): T;
}

const gonGlobal = globalThis as typeof globalThis & {
  Gon?: GonApi;
  gon?: GonApi;
};
const Gon = (gonGlobal.Gon || gonGlobal.gon) as GonApi;

if (!Gon) {
  // Helpful in dev if the server didn't inject it
  console.warn('[gon shim] window.Gon is not defined');
}

export default Gon;
export const gon = Gon;
