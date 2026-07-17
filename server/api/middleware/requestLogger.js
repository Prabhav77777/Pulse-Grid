import logger from '../../utils/logger.js';

/** Records each completed HTTP request as a structured event. */
export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => logger.info('HTTP request completed.', {
    method: req.method,
    path: req.originalUrl || req.path,
    responseTimeMs: Date.now() - startedAt,
    status: res.statusCode,
  }));
  next();
}
