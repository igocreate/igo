
// plugins
const CleanWebpackPlugin    = require('clean-webpack-plugin').CleanWebpackPlugin;
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');
const AssetsWebpackPlugin   = require('assets-webpack-plugin');


// Webpack config
module.exports = {
  entry: {
    main:   './js/main.js',
    vendor: './js/vendor.js'
  },
  output: {
    filename:   '[name]-[fullhash].js',
    path:       process.cwd() + '/public/dist',
    publicPath: '/dist/',
  },
  stats: {
    colors: true
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
      use: [{
        loader: 'url-loader',
        options: {
          limit: 8192,
        }
      }]
    }]
  },
  plugins: [
    // clean dist folder before building
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
      verbose: true
    }),
    // extract css
    new MiniCssExtractPlugin({
      filename:       '[name]-[fullhash].css',
      chunkFilename:  '[id]-[fullhash].css'
    }),
    // save stats
    new AssetsWebpackPlugin({
      filename: 'public/webpack-assets.json'
    })
  ]
};
