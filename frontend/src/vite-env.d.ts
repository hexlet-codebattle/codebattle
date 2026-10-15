/// <reference types="vite/client" />

// gettext catalogs, compiled to `{ msgid: msgstr }` by the po-loader Vite plugin.
declare module '*.po' {
  const messages: Record<string, string>;
  export default messages;
}

// Monaco's worker entry points (imported for their side effects by features/game/editor/workers).
declare module 'monaco-editor/esm/vs/*';
