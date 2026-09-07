
const config        = require('./src/config');
const cache         = require('./src/cache');
const logger        = require('./src/logger');

const problem = require('./src/api/problem');

const server = {
  app:        require('./src/app'),
  cache,
  config,
  dev:        require('./src/dev/index'),
  express:    require('express'),
  i18next:    require('i18next'),
  logger,
  mailer:     require('./src/mailer'),
  Form:       require('./src/forms/Form'),
  problem:    problem.problem,
  sendProblem: problem.send,
};

module.exports = server;
