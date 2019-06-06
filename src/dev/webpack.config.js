
const _       = require('lodash');
const path    = require('path');

const webpack = require('webpack');

// plugins
const CleanWebpackPlugin    = require('clean-webpack-plugin').CleanWebpackPlugin;
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');
const AssetsWebpackPlugin   = require('assets-webpack-plugin');

//
module.exports = {
  entry: {
    main:   './js/main.js',
    vendor: './js/vendor.js'
  },
  output: {
    filename: '[name]-[hash].js',
    path:     process.cwd() + '/public/dist'
  },
  module: {
    rules: [{
      test: /\.scss$/,
      exclude: /node_modules/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
        'sass-loader'
      ]
    }, {
      test: /\.less$/,
      exclude: /node_modules/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
        'less-loader'
      ]
    }, {
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react']
        }
      }
    }, {
      test: /\.(png|gif|jpg|jpeg|woff|woff2|eot|ttf|svg|otf)(\?v=\d+\.\d+\.\d+)?$/,
      use: 'url-loader?limit=8192'
    }]
  },
  plugins: [
    // clean dist folder before building
    new CleanWebpackPlugin(),
    // extract css
    new MiniCssExtractPlugin({
      filename:       '[name]-[hash].css',
      chunkFilename:  '[id]-[hash].css'
    }),
    // save stats
    new AssetsWebpackPlugin({
      filename: 'public/webpack-assets.json'
    })
  ]
};
