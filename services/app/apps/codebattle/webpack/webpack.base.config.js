const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const env = process.env.NODE_ENV || 'development';
// const isProd = env === 'production';

function recursiveIssuer(m) {
  if (m.issuer) {
    return recursiveIssuer(m.issuer);
  } else if (m.name) {
    return m.name;
  } else {
    return false;
  }
}

module.exports = {
  target: 'browserslist',
  entry: {
    app: ['./assets/js/app.js', './assets/css/style.scss'],
    landing: ['./assets/js/landing.js', './assets/css/landing.scss'],
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
        loader: 'i18next-po-loader',
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' },
          { loader: 'resolve-url-loader'},
          { loader: 'sass-loader' },
        ],
      },
      // {
      //   test: /\.(eot|svg|ttf|woff|woff2)$/,
      //   type: 'asset/inline',
      // },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[ext]',
        },
      },
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        appStyles: {
          name: 'app',
          test: (m, c, entry = 'app') =>
            m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
          chunks: 'all',
          enforce: true,
        },
        landingStyles: {
          name: 'landing',
          test: (m, c, entry = 'landing') =>
            m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
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
      filename: '[name].css',
    }),
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /(en|ru)$/),
  ],
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
  resolve: {
    alias: {
      './defineProperty': '@babel/runtime/helpers/esm/defineProperty',
    },
    fallback: {
      path: require.resolve('path-browserify'),
    },
    extensions: ['.js', '.jsx'],
  },
};
