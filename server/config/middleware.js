import cookieParser from 'cookie-parser';
import express from 'express';
import { JSON_BODY_LIMIT } from './constants.js';
import { createCorsMiddleware } from './cors.js';
import securityHeaders from './security.js';
import sessionManager from '../action/sessionManager.js';
import { requestLogger } from '../api/middleware/requestLogger.js';

/** Registers global request parsing, security, observability, and session middleware. */
export function configureMiddleware(app) {
  const cookieSecret = process.env.COOKIE_SECRET || process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !cookieSecret) throw new Error('COOKIE_SECRET or SESSION_SECRET must be configured in production');
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: JSON_BODY_LIMIT }));
  app.use(cookieParser(cookieSecret || 'pulsegrid-development-only-secret'));
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(sessionManager.middleware());
}
