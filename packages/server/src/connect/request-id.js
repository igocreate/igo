/**
 * Request ID Middleware
 * 
 * Assigns a unique ID to each request for tracing
 * - Uses existing X-Request-ID header if present
 * - Generates a new UUID otherwise
 * - Adds X-Request-ID to response headers
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID
 * @returns {string} UUID v4 compatible string
 */
const generateRequestId = () => {
  return crypto.randomUUID();
};

/**
 * Request ID middleware
 * Assigns req.id and sets X-Request-ID response header
 */
module.exports = (req, res, next) => {
  // Use existing request ID or generate new one
  req.id = req.headers['x-request-id'] || generateRequestId();
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', req.id);
  
  next();
};
