import logger from '../../utils/logger.js';

/** Returns a consistent API error without exposing production internals. */
export function errorHandler(error, req, res, next) {
  void next;
  const statusCode = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  logger.error('Unhandled API error.', { method: req.method, path: req.path, message: error.message, status: statusCode });
  res.status(statusCode).json({
    error: isProduction ? 'Internal server error' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
}
