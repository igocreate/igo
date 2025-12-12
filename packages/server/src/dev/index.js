
//
module.exports = {
  viteConfig:           require('./vite.config'),
  test:                 () => { require('./test/init'); },
  agent:                require('./test/agent'),
};
