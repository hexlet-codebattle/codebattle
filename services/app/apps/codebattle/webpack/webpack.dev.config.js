const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { merge } = require('webpack-merge');

const baseWebpackConfig = require('./webpack.base.config');

const devWebpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    static: {
      directory: '/assets',
    },
    devMiddleware: {
      writeToDisk: true,
    },
    hot: true,
    compress: true,
    // publicPath: '/assets'
    // overlay: {
    // warnings: true,
    // errors: true,
    // },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['react-refresh/babel'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
    }),
    new ReactRefreshWebpackPlugin(),
    // new BundleAnalyzerPlugin(),
  ],
});

module.exports = new Promise(resolve => {
  resolve(devWebpackConfig);
});
