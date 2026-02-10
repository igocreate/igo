/**
 * Health Check Middleware
 * 
 * Provides endpoint for monitoring application health
 * Checks database, cache (Redis), and system resources
 */

const db = require('@igojs/db');
const cache = require('../cache');
const logger = require('../logger');

/**
 * Check database connection health
 * @returns {Promise<Object>} Database health status
 */
const checkDatabase = async () => {
  try {
    // Try to execute a simple query
    const connection = await db.dbs.get();
    if (!connection) {
      return { status: 'error', message: 'No database connection' };
    }
    return { status: 'ok', message: 'Database connected' };
  } catch (err) {
    logger.error('Health check - Database error:', err);
    return { status: 'error', message: err.message };
  }
};

/**
 * Check Redis cache health
 * @returns {Promise<Object>} Cache health status
 */
const checkCache = async () => {
  try {
    const stats = await cache.getStats();
    if (!stats.connected) {
      return { status: 'error', message: 'Redis not connected' };
    }
    return { 
      status: 'ok', 
      message: 'Redis connected',
      keys: stats.keys
    };
  } catch (err) {
    logger.error('Health check - Cache error:', err);
    return { status: 'error', message: err.message };
  }
};

/**
 * Health check endpoint handler
 * Returns 200 if all checks pass, 503 if any check fails
 */
module.exports = async (req, res) => {
  try {
    const checks = {
      database: await checkDatabase(),
      cache: await checkCache(),
      memory: {
        status: 'ok',
        usage: process.memoryUsage()
      }
    };

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks
    };

    // Check if any service is unhealthy
    const isHealthy = Object.values(checks)
      .every(check => check.status === 'ok');

    if (!isHealthy) {
      health.status = 'degraded';
    }

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    logger.error('Health check failed:', err);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
};
