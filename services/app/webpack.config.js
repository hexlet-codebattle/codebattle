const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');


const env = process.env.NODE_ENV || 'development';
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
    languages: ['ruby', 'javascript', 'typescript', 'python', 'clojure', 'php', 'go'],
  }),
  new MiniCssExtractPlugin({
    filename: 'style.css',
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
    app: ['./assets/js/app.js', './assets/css/style.scss'],
  },
  devtool: isProd ? false : 'eval-source-map',
  devServer: {
    publicPath: '/assets',
  },

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
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: process.env.NODE_ENV === 'development',
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
