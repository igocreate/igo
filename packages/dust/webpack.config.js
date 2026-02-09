const path = require('path');
const pkg = require('./package.json');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `igo-dust-${pkg.version}-min.js`,
    library: 'IgoDust',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true
  },
  resolve: {
    alias: {
      fs: path.resolve(__dirname, 'src/fs/stub.js'),
      path: path.resolve(__dirname, 'src/fs/stub.js'),
    }
  },
  optimization: {
    minimize: true,
  },
  devtool: false,
};
