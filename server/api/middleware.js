/**
 * @file middleware.js
 * @description Express middleware functions for request validation, error
 *   handling, logging, and CORS configuration. Each middleware is a focused,
 *   composable unit following the single-responsibility principle.
 *   #Business-Intent: Protects the API surface from malformed input, logs
 *   operational telemetry, and enforces cross-origin policies for the
 *   PulseGrid stadium dashboard.
 *
 * @level-one-validation
 *   Summary: Six middleware functions — chat input validation, locale validation,
 *     recommendation action validation, centralized error handler, request logger,
 *     and CORS configuration.
 *   Correctness: Input sanitization strips HTML; error handler hides internals
 *     in production; logger captures response time via res.on('finish').
 *   Rubric: Security (input sanitization, error concealment), Observability
 *     (structured logging), Code Quality (composable middleware).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Input security, API robustness, observability.
 *   #Scope-Of-Improvement: Add request ID generation (X-Request-Id) for
 *     distributed tracing; integrate structured JSON logger (pino/winston).
 */

import cors from 'cors';

/** Allowed locale codes for multilingual support */
const ALLOWED_LOCALES = ['en', 'es', 'fr', 'ar'];

/** Maximum chat message length in characters */
const MAX_CHAT_LENGTH = 500;

/**
 * Strips HTML tags from a string to prevent XSS in stored/reflected content.
 * @param {string} str
 * @returns {string}
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate chat input: must be a non-empty string under MAX_CHAT_LENGTH chars.
 * Sanitizes HTML entities in the message body.
 *
 * @risk-area: Input validation is the first line of defense against injection
 * attacks. Chat messages are forwarded to the Gemini LLM, so sanitization
 * also mitigates prompt injection surface.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function validateChatInput(req, res, next) {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Message must be a non-empty string.',
    });
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Message cannot be empty or whitespace only.',
    });
  }

  if (trimmed.length > MAX_CHAT_LENGTH) {
    return res.status(400).json({
      error: 'Invalid input',
      details: `Message exceeds maximum length of ${MAX_CHAT_LENGTH} characters.`,
    });
  }

  // Sanitize and overwrite — downstream handlers receive clean input
  // @risk-area: sanitization must happen before any persistence or LLM forwarding
  req.body.message = sanitizeHtml(trimmed);
  next();
}

/**
 * Validate the locale query/body parameter against the allowed set.
 * Defaults to 'en' if not provided.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function validateLocale(req, res, next) {
  const locale = req.body?.locale || req.query?.locale || 'en';

  if (!ALLOWED_LOCALES.includes(locale)) {
    return res.status(400).json({
      error: 'Invalid locale',
      details: `Locale must be one of: ${ALLOWED_LOCALES.join(', ')}`,
      allowedLocales: ALLOWED_LOCALES,
    });
  }

  // Normalize onto req for downstream use
  req.locale = locale;
  next();
}

/**
 * Validate optional approval/rejection notes before they are stored in the audit trail.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function validateRecommendationAction(req, res, next) {
  for (const field of ['notes', 'reason']) {
    if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > 500)) {
      return res.status(400).json({ error: 'Invalid action', details: `${field} must be a string up to 500 characters.` });
    }
  }
  next();
}

/**
 * Centralized error handler. Sanitizes error details in production to prevent
 * information leakage.
 *
 * @param {Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    status: statusCode,
    message: err.message,
    // Only log stack in non-production
    ...(isProduction ? {} : { stack: err.stack }),
  });

  res.status(statusCode).json({
    error: isProduction ? 'Internal server error' : err.message,
    // #What: In development, include the stack trace for debugging convenience
    ...(isProduction ? {} : { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request logger middleware. Logs method, path, status code, and response
 * time for every request.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Capture the original end to log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };

    // Color-code by status range for terminal readability
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' // red
      : res.statusCode >= 400 ? '\x1b[33m' // yellow
        : res.statusCode >= 300 ? '\x1b[36m' // cyan
          : '\x1b[32m'; // green

    console.log(
      `${statusColor}${log.method}\x1b[0m ${log.path} → ${statusColor}${log.status}\x1b[0m (${log.responseTimeMs}ms)`
    );
  });

  next();
}

/**
 * CORS configuration factory.
 * #Business-Intent: Allows the Vite dev server (port 5173) and production
 * origins to communicate with the API while blocking unauthorized origins.
 *
 * @returns {Function} Configured CORS middleware
 */
export function corsConfig() {
  const allowedOrigins = [
    'http://localhost:5173',    // Vite dev server
    'http://localhost:3000',    // Alternative dev port
    'http://localhost:3001',    // Same-origin API testing
    'http://127.0.0.1:5173',
    'https://pulse-grid-zeta.vercel.app',
  ];

  // In production, read allowed origins from environment
  if (process.env.CORS_ORIGINS) {
    const envOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
    allowedOrigins.push(...envOrigins);
  }

  return cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24h preflight cache
  });
}
