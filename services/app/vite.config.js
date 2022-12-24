import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inject from '@rollup/plugin-inject';
import i18nextLoader from 'vite-plugin-i18next-loader';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      '~nprogress': path.resolve(__dirname, 'node_modules/nprogress'),
      '~font-mfizz': path.resolve(__dirname, 'node_modules/font-mfizz'),
    },
  },
  build: {
    target: 'es2018',
    minify: true,
    outDir: '../priv2/static',
    emptyOutDir: true,
    rollupOptions: {
      input: [
        './assets/js/app.js',
        './assets/css/style.scss',
        './assets/js/landing.js',
        './assets/css/landing.scss',
      ],
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: '[ext]/[name][extname]',
      },
    },
    assetsInlineLimit: 0,
  },
  plugins: [
    inject({
      process: ['process', '*'],
    }),
    react(),
    i18nextLoader({ paths: ['./priv/locales'] }),
  ],
  server: {
    port: 8080,
    host: '0.0.0.0',
    origin: 'http://localhost:8080',
  },
});
