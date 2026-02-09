
//
module.exports = {
  webpackConfig:        require('./webpack.config'),
  test:                 () => { require('./test/init'); },
  agent:                require('./test/agent'),
};
