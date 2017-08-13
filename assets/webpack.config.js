const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: ['bootstrap-loader', './js/app.js'],
  output: {
    path: path.join(__dirname, '..', 'priv', 'static', 'js'),
    filename: 'app.js',
    publicPath: path.join(__dirname, '..', 'priv', 'static'),
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          // presets: [
          //   'flow',
          //   ['env', {
          //     modules: false,
          //     targets: {
          //       browsers: '> 0%',
          //       uglify: true,
          //     },
          //     useBuiltIns: true,
          //   }],
          // ],
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
    {
      test: /bootstrap[/\\]dist[/\\]js[/\\]umd[/\\]/,
      use: 'imports-loader?jQuery=jquery',
    }],
  },
  plugins: [
    new ExtractTextPlugin('css/app.css'),
    new CopyWebpackPlugin([{ from: path.join(__dirname, 'static'), to: path.join(__dirname, '..', 'priv', 'static') }]),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Tether: 'tether',
      'window.Tether': 'tether',
      Alert: 'exports-loader?Alert!bootstrap/js/dist/alert',
      Button: 'exports-loader?Button!bootstrap/js/dist/button',
      Carousel: 'exports-loader?Carousel!bootstrap/js/dist/carousel',
      Collapse: 'exports-loader?Collapse!bootstrap/js/dist/collapse',
      Dropdown: 'exports-loader?Dropdown!bootstrap/js/dist/dropdown',
      Modal: 'exports-loader?Modal!bootstrap/js/dist/modal',
      Popover: 'exports-loader?Popover!bootstrap/js/dist/popover',
      Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/dist/scrollspy',
      Tab: 'exports-loader?Tab!bootstrap/js/dist/tab',
      Tooltip: 'exports-loader?Tooltip!bootstrap/js/dist/tooltip',
      Util: 'exports-loader?Util!bootstrap/js/dist/util',
    }),
  ],
  devServer: {
    hot: true,
    stats: 'errors-only',
  },
  resolve: {
    modules: ['node_modules', path.join(__dirname, 'assets', 'js')],
    extensions: ['.js', '.jsx'],
  },
};
