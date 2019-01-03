
const winston     = require('winston');
const Papertrail  = require('winston-papertrail').Papertrail;

const config = require('./config');

//
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.printf(info => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  transports: []
});

//
module.exports = logger;

//
module.exports.init = () => {

  logger.add(new winston.transports.Console());

  // logger.add(new winston.transports.File({
  //   filename: `logs/${config.env}.log`
  // }));

  if (config.env === 'test') {
    logger.silent = true;
  }

  if (process.env.PAPERTRAIL_HOST && config.env !== 'test') {
    logger.add(new winston.transports.Papertrail({
    	host: 'logs.papertrailapp.com',
    	port: 12345
    }));
  }

  logger.debug('Winston logger initialized');

}
