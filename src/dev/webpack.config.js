
// plugins
const CleanWebpackPlugin    = require('clean-webpack-plugin').CleanWebpackPlugin;
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');
const AssetsWebpackPlugin   = require('assets-webpack-plugin');


// Webpack config
const webpackConfig = {
  entry: {
    main:   './js/main.js',
    vendor: './js/vendor.js'
  },
  output: {
    filename:           '[name]-[contenthash].js',
    path:               process.cwd() + '/public/dist',
    publicPath:         '/dist/',
    sourceMapFilename:  '[name]-[contenthash].js.map'
  },
  target:   ['web', 'es5'], // IE 11 compatibility
  devtool:  'source-map',
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
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                [ 'autoprefixer' ],
              ],
            },
          }
        },
        'sass-loader'
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
      type: 'asset/resource'
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
      filename:       '[name]-[contenthash].css',
      chunkFilename:  '[id]-[contenthash].css'
    }),
    // save stats
    new AssetsWebpackPlugin({
      filename: 'public/webpack-assets.json'
    })
  ],
  devServer: {
    port: 9000,
    static: {
      directory: process.cwd() + '/public',
    },
    watchFiles: ['views/**/*.dust', 'public/**/*'],
    compress: true,
    liveReload: true,
    client: {
      progress: true,
      reconnect: true,
      overlay: true
    }
  }
};

module.exports = webpackConfig;