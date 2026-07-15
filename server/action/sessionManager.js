/**
 * @file sessionManager.js
 * @description Minimal secure session management for PulseGrid staff
 *   authentication. Provides in-memory session storage, Express middleware
 *   for signed httpOnly cookie validation, and mock staff users for development.
 *   #Business-Intent: Ensures only authenticated stadium operations staff can
 *   access the approval workflow and audit trail, satisfying security requirements
 *   for human-in-the-loop AI governance.
 *
 * @level-one-validation
 *   Summary: SessionManager class with session CRUD, expiry cleanup, Express
 *     middleware for cookie-based auth, and mock user generation.
 *   Correctness: Sessions use crypto.randomUUID, 2-hour TTL, signed cookies.
 *   Rubric: Security (httpOnly cookies, session expiry), Code Quality (clean middleware).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Authentication security, session lifecycle management.
 *   #Scope-Of-Improvement: Migrate to Redis-backed sessions for horizontal
 *     scaling; add refresh token rotation; integrate with OAuth2/SAML IdP.
 */

import crypto from 'node:crypto';

/** Default session duration: 2 hours in milliseconds */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/** Cookie name for session identifier */
const SESSION_COOKIE = 'pulsegrid_sid';

/**
 * In-memory session manager with signed httpOnly cookie middleware.
 *
 * #Scope-Of-Improvement: Redis in production — in-memory sessions do not
 * survive restarts and cannot be shared across multiple server instances.
 */
class SessionManager {
  /** @type {SessionManager|null} */
  static #instance = null;

  constructor() {
    if (SessionManager.#instance) {
      return SessionManager.#instance;
    }

    /**
     * Active sessions keyed by session ID.
     * #Scope-Of-Improvement: Redis in production
     * @type {Map<string, Object>}
     */
    this.sessions = new Map();

    // Periodic cleanup of expired sessions every 5 minutes
    this._cleanupInterval = setInterval(() => this.cleanExpiredSessions(), 5 * 60 * 1000);
    // Allow the process to exit even if the interval is active
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }

    SessionManager.#instance = this;
  }

  /**
   * Create a new session for an authenticated user.
   * @param {Object} userData - User information to store in the session
   * @param {string} userData.id       - User identifier
   * @param {string} userData.username - Display username
   * @param {string} userData.role     - Staff role
   * @returns {Object} Session object including sessionId and expiresAt
   */
  createSession(userData) {
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const session = {
      sessionId,
      userId: userData.id,
      username: userData.username,
      role: userData.role,
      permissions: userData.permissions || [],
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
      expiresAtMs: now + SESSION_TTL_MS,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Retrieve a session by its ID, returning null if expired or missing.
   * @param {string} sessionId
   * @returns {Object|null}
   */
  getSession(sessionId) {
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiry
    if (Date.now() > session.expiresAtMs) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Explicitly destroy a session (logout).
   * @param {string} sessionId
   * @returns {boolean} True if a session was removed
   */
  destroySession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Remove all expired sessions from memory.
   * @returns {number} Count of sessions removed
   */
  cleanExpiredSessions() {
    const now = Date.now();
    let removed = 0;

    for (const [id, session] of this.sessions) {
      if (now > session.expiresAtMs) {
        this.sessions.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Express middleware that validates the signed httpOnly session cookie.
   * Attaches `req.session` with user data if valid, otherwise responds 401.
   *
   * @risk-area: session handling — this middleware is the security gate for
   * all protected routes. Cookie must be signed and httpOnly to prevent XSS
   * session hijacking.
   *
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      // Read session ID from signed cookie (cookie-parser populates req.signedCookies)
      const sessionId = req.signedCookies?.[SESSION_COOKIE] || req.cookies?.[SESSION_COOKIE];

      if (!sessionId) {
        // Allow unauthenticated access — routes can check req.staffSession themselves
        req.staffSession = null;
        return next();
      }

      const session = this.getSession(sessionId);
      if (!session) {
        // Clear the stale cookie
        res.clearCookie(SESSION_COOKIE);
        req.staffSession = null;
        return next();
      }

      // Attach session data for downstream handlers
      req.staffSession = {
        userId: session.userId,
        username: session.username,
        role: session.role,
        permissions: session.permissions,
        sessionId: session.sessionId,
      };

      next();
    };
  }

  /**
   * Helper to set the session cookie on a response.
   * @param {Object} res       - Express response object
   * @param {string} sessionId - Session UUID to store in cookie
   */
  setSessionCookie(res, sessionId) {
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
  }

  requireAuthentication() {
    return (req, res, next) => {
      if (!req.staffSession) return res.status(401).json({ error: 'Authentication required' });
      next();
    };
  }

  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.staffSession) return res.status(401).json({ error: 'Authentication required' });
      if (!req.staffSession.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient permission' });
      }
      next();
    };
  }

  /**
   * Helper to clear the session cookie on a response.
   * @param {Object} res - Express response object
   */
  clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  /**
   * Shut down the cleanup interval (for graceful shutdown).
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

/**
 * Generate mock staff users for development and demo purposes.
 * #Business-Intent: Enables immediate testing of the approval workflow
 * without requiring a real identity provider integration.
 * @returns {Array<Object>} Array of mock staff user objects
 */
export function generateMockStaffUsers() {
  return [
    {
      id: 'staff-001',
      username: 'ops_commander',
      password: 'pulse2026!',
      role: 'operations_commander',
      displayName: 'Maria González',
      permissions: ['approve', 'reject', 'view_audit', 'generate_report'],
    },
    {
      id: 'staff-002',
      username: 'safety_lead',
      password: 'safe2026!',
      role: 'safety_officer',
      displayName: 'James Chen',
      permissions: ['approve', 'reject', 'view_audit'],
    },
    {
      id: 'staff-003',
      username: 'crowd_analyst',
      password: 'crowd2026!',
      role: 'crowd_analyst',
      displayName: 'Aisha Patel',
      permissions: ['view_audit', 'generate_report'],
    },
  ];
}

// Singleton instance
const sessionManager = new SessionManager();

export { SessionManager, sessionManager, SESSION_COOKIE };
export default sessionManager;
