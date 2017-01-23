
//
module.exports = {
  webpackConfig:        require('./webpack.config'),
  test:                 function() { require('./test/init'); },
  agent:                require('./test/agent'),
};
