#!/usr/bin/env node
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config');

new WebpackDevServer(webpack(config), {
  contentBase: 'http://localhost:4001',
  publicPath: config.output.publicPath,
  hot: true,
  stats: {
    colors: true,
    version: false,
    chunkModules: false,
  },
}).listen(4001, '0.0.0.0', function (err, result) {
  if (err) console.error(err);
  console.log('webpack-dev-server running on port 4001');
});

// Exit on end of STDIN
process.stdin.resume();
process.stdin.on('end', function () {
  process.exit(0);
});
