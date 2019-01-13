const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


const env = process.env.NODE_ENV || 'dev';
const isProd = env === 'production';
// const publicPath = 'http://localhost:4002';

const DEV_ENTRIES = [
  // 'react-hot-loader/patch',
  // 'webpack-dev-server/client?' + publicPath,
  // 'webpack/hot/only-dev-server',
];

const APP_ENTRIES = ['./assets/js/app.js', './assets/css/app.scss'];

const commonPlugins = [
  new CopyWebpackPlugin([
    { from: 'assets/static' },
  ]),
  new webpack.EnvironmentPlugin({
    NODE_ENV: isProd ? 'production' : 'development',
  }),
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    'window.jQuery': 'jquery',
    Tether: 'tether',
    Popper: ['popper.js', 'default'],
  }),
  new MonacoWebpackPlugin(),
  new MiniCssExtractPlugin({
    filename: 'app.css',
  }),
];

const devPlugins = commonPlugins;
const productionPlugins = [
  ...commonPlugins,
  // new UglifyJsPlugin(),
];

module.exports = {
  entry: {
    app: isProd ? APP_ENTRIES : DEV_ENTRIES.concat(APP_ENTRIES),
  },
  devtool: isProd ? false : 'cheap-module-eval-source-map',
  output: {
    path: `${__dirname}/priv/static/assets`,
    filename: 'app.js',
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
        use:
        {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [
              '@babel/env',
              '@babel/react',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              ['@babel/plugin-proposal-class-properties', { loose: false }],
            ],
          },
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: 'url-loader',
      },
    ],
  },
  plugins: isProd ? productionPlugins : devPlugins,
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
  resolve: {
    modules: ['node_modules', path.join(__dirname, 'assets', 'js')],
    extensions: ['.js', '.jsx'],
  },
};
