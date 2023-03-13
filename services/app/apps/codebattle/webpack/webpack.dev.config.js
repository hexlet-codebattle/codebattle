const webpack = require('webpack');
const { merge } = require('webpack-merge');
// const path = require('path');
const baseWebpackConfig = require('./webpack.base.config');

const devWebpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    static: {
      directory: '/assets',
    },
    devMiddleware: {
      writeToDisk: true
    },
    hot: true,
    compress: true,
    // publicPath: '/assets'
    // overlay: {
    // warnings: true,
    // errors: true,
    // },
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
    }),
  ],
});

module.exports = new Promise(resolve => {
  resolve(devWebpackConfig);
});
