/// <reference types="vite/client" />

// gettext catalogs, compiled to `{ msgid: msgstr }` by the po-loader Vite plugin.
declare module '*.po' {
  const messages: Record<string, string>;
  export default messages;
}

// Monaco's worker entry points (imported for their side effects by features/game/editor/workers).
declare module 'monaco-editor/esm/vs/*';

// Swagger UI's self-contained CommonJS bundle (src/apiDocs); the package ships no types.
declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  const SwaggerUI: (options: Record<string, unknown>) => unknown;
  export default SwaggerUI;
}
