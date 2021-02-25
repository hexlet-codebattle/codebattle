const { merge } = require('webpack-merge');
const Dotenv = require('dotenv-webpack');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const baseWebpackConfig = require('./webpack.base.config');

const buildWebpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  plugins: [
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessorPluginOptions: {
        preset: ['default', { discardComments: { removeAll: true } }],
      },
      canPrint: true,
    }),
    new Dotenv({
      path: '../.env',
    }),
  ],
});

module.exports = new Promise(resolve => {
  resolve(buildWebpackConfig);
});
