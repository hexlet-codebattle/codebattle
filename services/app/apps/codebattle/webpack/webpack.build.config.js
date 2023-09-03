const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { merge } = require('webpack-merge');

const baseWebpackConfig = require('./webpack.base.config');

const buildWebpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(), // minimize JS code
      new CssMinimizerPlugin({
        test: /\.css$/i, // specify which files to minimize
      }),
    ],
  },
});

module.exports = new Promise(resolve => {
  resolve(buildWebpackConfig);
});
