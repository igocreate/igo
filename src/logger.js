
const winston     = require('winston');

const config = require('./config');

//
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.printf(info => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  colorize: true,
  transports: [
    new winston.transports.Console()
  ]
});

//
module.exports = logger;

//
module.exports.init = () => {

  // logger.add(new winston.transports.File({
  //   filename: `logs/${config.env}.log`
  // }));

  if (config.loglevel) {
    logger.level = config.loglevel;
  }

  // if (process.env.PAPERTRAIL_HOST && config.env !== 'test') {
  //   logger.add(new winston.transports.Papertrail({
  //     host: 'logs.papertrailapp.com',
  //     port: 12345
  //   }));
  // }

  logger.debug('Winston logger initialized');

};
