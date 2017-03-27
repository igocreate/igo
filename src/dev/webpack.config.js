
const _       = require('lodash');
const path    = require('path');

const webpack = require('webpack');

// plugins
const CleanWebpackPlugin    = require('clean-webpack-plugin');
const AutoCleanBuildPlugin  = require('webpack-auto-clean-build-plugin');
const ExtractTextPlugin     = require('extract-text-webpack-plugin');
const webpackUglifyJsPlugin = require('webpack-uglify-js-plugin');
const WebpackChunkHash      = require('webpack-chunk-hash');
const AssetsWebpackPlugin   = require('assets-webpack-plugin');

//
module.exports = {
  entry: {
    main:   './js/main.js',
    vendor: './js/vendor.js'
  },
  output: {
    filename: '[name]-[chunkhash].js',
    path:     process.cwd() + '/public/dist'
  },
  module: {
    rules: [{
      test: /\.scss$/,
      exclude: /node_modules/,
      use: ExtractTextPlugin.extract({
        use: ['css-loader', 'sass-loader']
      })
    }, {
      test: /\.less$/,
      exclude: /node_modules/,
      use: ExtractTextPlugin.extract({
        use: ['css-loader', 'less-loader']
      })
    }, {
      test: /\.jsx$/,
      exclude: /node_modules/,
      use: 'babel-loader'
    }, {
      test: /\.(png|woff|woff2|eot|ttf|svg)(\?v=\d+\.\d+\.\d+)?$/,
      use: 'url-loader?limit=100000'
    }]
  },
  // devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(['public/dist'], {
      root: process.cwd(),
      verbose: true,
      dry: false
    }),
    new AutoCleanBuildPlugin(),
    new ExtractTextPlugin({
      filename:   '[name]-[chunkhash].css',
      disable:    false,
      allChunks:  true
    }),
    new webpack.optimize.CommonsChunkPlugin({
      names: ['vendor', 'manifest']
    }),
    // Plugin to replace a standard webpack chunk hashing with custom (md5) one.
    new WebpackChunkHash({
      algorithm: 'md5'
    }),
    // save stats
    new AssetsWebpackPlugin({
      filename: 'public/webpack-assets.json'
    })
    // function() {
    //   this.plugin("done", function(stats) {
    //     var chunks = _.map(stats.compilation.chunks, function(chunk) {
    //       var chunk = _.pick(chunk, [
    //         'id', 'ids', 'name',
    //         'files', 'hash', 'renderedHash'
    //       ]);
    //       chunk.files = _.keyBy(chunk.files, function(file) {
    //         return file.substring(file.indexOf('.') + 1);
    //       });
    //       return chunk;
    //     });
    //     chunks = _.keyBy(chunks, 'name');
    //     require("fs").writeFileSync(
    //       './public/chunks.json',
    //       JSON.stringify(chunks));
    //   });
    // }
  ]
};
