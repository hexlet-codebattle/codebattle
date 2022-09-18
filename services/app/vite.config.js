const path = require('path');

export default {
  root: path.resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      '~nprogress': path.resolve(__dirname, 'node_modules/nprogress'),
      '~font-mfizz': path.resolve(__dirname, 'node_modules/font-mfizz'),
    },
  },
  publicDir: './static',
  build: {
    target: 'es2018',
    minify: true,
    outDir: '../priv2/static',
    emptyOutDir: true,
    rollupOptions: {
      input: ['./assets/js/app.js', './assets/css/style.scss'],
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: '[ext]/[name][extname]',
      },
    },
    assetsInlineLimit: 0,
  },
};
