const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

module.exports = {
  entry: {
    app: ['./assets/js/app.js', './assets/css/style.scss'],
  },
  output: {
    path: path.resolve(__dirname, '../priv/static/assets'),
    filename: '[name].js',
    sourceMapFilename: '[name].js.map',
    publicPath: '/assets/',
  },
  externals: {
    gon: 'Gon',
  },
  module: {
    rules: [
      {
        test: /\.po$/,
        loaders: ['i18next-po-loader'],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: !isProd,
            },
          },
          { loader: 'css-loader' },
          { loader: 'sass-loader' },
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: 'url-loader',
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'assets/static' }],
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default'],
    }),
    new MonacoWebpackPlugin({
      languages: [
        'ruby',
        'javascript',
        'typescript',
        'python',
        'clojure',
        'php',
        'go',
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /(en|ru)$/),
  ],
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
