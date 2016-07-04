
//
module.exports = {
  setDefaultGulpTasks:  require('./gulpfile.js'),
  test:                 function() { require('./test/init'); },
  agent:                require('./test/agent.js'),
};
