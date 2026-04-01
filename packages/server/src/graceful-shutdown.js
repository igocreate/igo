/**
 * Graceful Shutdown Module
 * 
 * Handles graceful shutdown on SIGTERM/SIGINT signals
 * - Stops accepting new requests
 * - Waits for pending requests to complete
 * - Closes database connections
 * - Closes Redis connection
 * - Forces shutdown after timeout
 */

const logger = require('./logger');
const db = require('@igojs/db');
const cache = require('./cache');

const SHUTDOWN_TIMEOUT = 30000; // 30 seconds

/**
 * Setup graceful shutdown handlers
 * @param {http.Server} server - HTTP server instance
 */
module.exports.setup = (server) => {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed - no new connections accepted');
        
        try {
          // Close database connections
          logger.info('Closing database connections...');
          await db.dbs.close();
          logger.info('Database connections closed');
          
          // Close Redis connection
          logger.info('Closing Redis connection...');
          await cache.disconnect();
          logger.info('Redis connection closed');
          
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error('Error during graceful shutdown:', err);
          process.exit(1);
        }
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        logger.error(`Forced shutdown after ${SHUTDOWN_TIMEOUT}ms timeout`);
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);
    });
  });
  
  logger.debug('Graceful shutdown handlers registered');
};
