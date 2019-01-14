const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');


const env = process.env.NODE_ENV || 'dev';
const isProd = env === 'production';

const commonPlugins = [
  new CopyWebpackPlugin([
    { from: 'assets/static' },
  ]),
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    'window.jQuery': 'jquery',
    Popper: ['popper.js', 'default'],
  }),
  new MonacoWebpackPlugin({
    languages: ['ruby', 'javascript', 'perl', 'python', 'clojure', 'php'],
  }),
  new MiniCssExtractPlugin({
    filename: 'app.css',
  }),
  new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /(en|ru)$/),
];

const devPlugins = [
  ...commonPlugins,
  new BundleAnalyzerPlugin({
    analyzerMode: 'disabled',
  }),
];

const productionPlugins = [
  ...commonPlugins,
  new OptimizeCssAssetsPlugin({
    assetNameRegExp: /\.css$/g,
    cssProcessorPluginOptions: {
      preset: ['default', { discardComments: { removeAll: true } }],
    },
    canPrint: true,
  }),
];

module.exports = {
  entry: {
    app: ['./assets/js/app.js', './assets/css/app.scss'],
  },
  devtool: isProd ? false : 'eval-source-map',
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
          { loader: isProd ? MiniCssExtractPlugin.loader : 'style-loader' },
          'css-loader',
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
