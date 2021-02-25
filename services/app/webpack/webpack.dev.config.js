const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const { merge } = require('webpack-merge');
const baseWebpackConfig = require('./webpack.base.config');

const devWebpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    writeToDisk: true,
    publicPath: '/assets',
    overlay: {
      // warnings: true,
      errors: true,
    },
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
    }),
    new Dotenv({
      path: '../.env',
    }),
  ],
});

module.exports = new Promise(resolve => {
  resolve(devWebpackConfig);
});
