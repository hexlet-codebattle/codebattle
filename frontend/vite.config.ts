import path from 'node:path';

import react from '@vitejs/plugin-react';
import gettextParser from 'gettext-parser';
import { defineConfig, type Plugin } from 'vite';

// The frontend dev server (Phoenix runs it as a watcher, see config/dev.exs).
// Keep in sync with compose.yml and CodebattleWeb.Frontend.
const port = Number(process.env.CODEBATTLE_FRONTEND_PORT) || 8081;

// Turns a gettext .po file into `{ msgid: msgstr }` for i18next. Untranslated
// entries are dropped so i18next falls back to the key (the English text).
function poLoader(): Plugin {
  return {
    name: 'po-loader',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.po')) return null;

      const po = gettextParser.po.parse(code);
      const messages: Record<string, string> = {};

      for (const context of Object.values(po.translations)) {
        for (const [key, entry] of Object.entries(context)) {
          const value = entry.msgstr?.[0];
          if (key && value) messages[key] = value;
        }
      }

      return { code: `export default ${JSON.stringify(messages)};`, map: null };
    },
  };
}

// Phoenix stops its watchers by closing stdin; exit with it so the dev server
// doesn't keep the port and break the next `make server`.
function exitOnStdinClose(command: string) {
  if (command !== 'serve') return;
  process.stdin.on('close', () => process.exit(0));
  process.stdin.resume();
}

export default defineConfig(({ command }) => {
  exitOnStdinClose(command);

  return {
    plugins: [poLoader(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // monaco-vim deep-imports Monaco internals that its exports map hides.
        'monaco-editor/esm/vs': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs'),
      },
    },
    // Pre-bundle Monaco's workers so the dev server serves them as single modules.
    optimizeDeps: {
      include: [
        'monaco-editor/esm/vs/editor/editor.worker',
        'monaco-editor/esm/vs/language/css/css.worker',
        'monaco-editor/esm/vs/language/typescript/ts.worker',
      ],
    },
    // Production files are copied to priv/static/assets/v2 (see Containerfile.codebattle),
    // which nginx and phx.digest already serve under /assets.
    base: command === 'serve' ? '/' : '/assets/v2/',
    server: {
      // Translations live in ../priv/gettext (shared with the Phoenix app).
      fs: { allow: ['..'] },
      host: '0.0.0.0',
      port,
      strictPort: true,
      cors: true,
      // Pages are served by Phoenix (:4000); asset URLs must point back at Vite.
      origin: `http://localhost:${port}`,
      hmr: { host: 'localhost', protocol: 'ws', port },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsDir: '',
      manifest: 'manifest.json',
      rollupOptions: {
        // index.html (theme showcase) is dev-only: open http://localhost:8081/.
        input: {
          main: path.resolve(__dirname, 'src/main.tsx'),
          // Admin pages: LiveView socket + legacy admin styles (layout/admin.html.heex).
          admin: path.resolve(__dirname, 'src/admin/main.ts'),
        },
      },
    },
  };
});
