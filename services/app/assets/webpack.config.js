const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const env = process.env.MIX_ENV || 'dev';
const prod = env === 'prod';
// const publicPath = 'http://localhost:4002';

const DEV_ENTRIES = [
  // 'react-hot-loader/patch',
  // 'webpack-dev-server/client?' + publicPath,
  // 'webpack/hot/only-dev-server',
];

const APP_ENTRIES = ['./js/app.js'];

const plugins = [
  new ExtractTextPlugin('../css/app.css'),
  new CopyWebpackPlugin([{
    from: path.join(__dirname, 'static'),
    to: path.resolve(__dirname, '..', 'priv', 'static'),
  }]),
  new webpack.EnvironmentPlugin({
    NODE_ENV: prod ? 'production' : 'development',
  }),
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    'window.jQuery': 'jquery',
    Tether: 'tether',
    Popper: ['popper.js', 'default'],
  }),
];

module.exports = {
  entry: {
    app: prod ? APP_ENTRIES : DEV_ENTRIES.concat(APP_ENTRIES),
  },
  devtool: prod ? false : 'cheap-module-eval-source-map',
  output: {
    path: path.resolve(__dirname, '..', 'priv', 'static', 'js'),
    filename: 'app.js',
    publicPath: path.resolve(__dirname, '..', 'priv', 'static'),
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
            presets: [
              'flow',
              'es2015',
              'stage-0',
              'react', [
                'env',
                {
                  modules: false,
                  targets: {
                    browsers: '> 0%',
                    uglify: true,
                  },
                  useBuiltIns: true,
                },
              ],
            ],
            plugins: ['transform-class-properties'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader',
        }),
      },
      {
        test: /\.(jpe?g|png|gif|svg|woff2?)$/,
        use: [{
          loader: 'url-loader',
          options: { limit: 40000 },
        },
        'image-webpack-loader',
        ],
      },
    ],
  },
  plugins,
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
  resolve: {
    modules: ['node_modules', path.join(__dirname, 'assets', 'js')],
    extensions: ['.js', '.jsx'],
  },
};
