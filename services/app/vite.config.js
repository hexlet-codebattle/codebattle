import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inject from '@rollup/plugin-inject';
import i18nextLoader from 'vite-plugin-i18next-loader';
import path from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      '~nprogress': path.resolve(__dirname, 'node_modules/nprogress'),
      '~font-mfizz': path.resolve(__dirname, 'node_modules/font-mfizz'),
    },
  },
  base: '/assets/',
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
        }),
      ],
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(`${mode}`),
  },
  build: {
    target: 'es2018',
    minify: true,
    outDir: '../priv/static/assets',
    manifest: true,
    emptyOutDir: true,
    rollupOptions: {
      input: [
        './assets/js/app.js',
        './assets/js/landing.js',
      ],
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: '[ext]/[name][extname]',
      },
      plugins: [
        inject({
          process: ['process', '*'],
        }),
      ],
    },
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    i18nextLoader({ paths: ['./priv/locales'] }),
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'typescript'],
    }),
  ],
  server: {
    port: 8080,
    host: '0.0.0.0',
    origin: 'http://localhost:8080',
  },
}));
