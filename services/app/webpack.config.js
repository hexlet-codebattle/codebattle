const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

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
  new ExtractTextPlugin('css/app.css'),
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
];

const devPlugins = commonPlugins;
const productionPlugins = [
  ...commonPlugins,
  new UglifyJsPlugin(),
];

module.exports = {
  entry: {
    app: isProd ? APP_ENTRIES : DEV_ENTRIES.concat(APP_ENTRIES),
  },
  devtool: isProd ? false : 'cheap-module-eval-source-map',
  output: {
    path: `${__dirname}/priv/static`,
    filename: 'js/app.js',
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
          options: {
            cacheDirectory: true,
            presets: ['env', 'flow', 'stage-0'],
          },
        },
      },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'postcss-loader', 'sass-loader'],
        }),
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
