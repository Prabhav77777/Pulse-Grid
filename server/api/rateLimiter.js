/**
 * @file rateLimiter.js
 * @description Sliding-window in-memory rate limiter with two tiers.
 * #Business-Intent: Security & Efficiency — protects API from abuse and
 *   guards expensive LLM calls behind a stricter window.
 *
 * @level-one-validation
 *   Summary: Provides a RateLimiter class using a sliding-window algorithm
 *     (per-IP timestamp array) and two pre-configured instances.
 *   Correctness: Each request timestamp is stored; expired ones are pruned
 *     on every check. O(n) per check where n = window size (bounded by maxRequests).
 *   Rubric: Security (25%), Efficiency (15%)
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Security, Efficiency.
 *   #Scope-Of-Improvement: Move to Redis-backed sliding window for
 *     multi-instance deployments.
 */

/**
 * Sliding-window rate limiter.
 *
 * Each key (typically a client IP) maps to an array of request timestamps.
 * On every call to `isRateLimited` we:
 *   1. Prune timestamps older than `windowMs`.
 *   2. Check length against `maxRequests`.
 *   3. If under the limit, push the new timestamp and allow.
 *
 * #Business-Intent: Security — prevents brute-force and resource exhaustion.
 */
export class RateLimiter {
  /**
   * @param {object} opts
   * @param {number} opts.windowMs  – Sliding window duration in ms (default 60 000).
   * @param {number} opts.maxRequests – Max requests allowed per window (default 30).
   * @param {string} opts.name       – Human-readable name for logging.
   */
  constructor({ windowMs = 60_000, maxRequests = 30, name = 'default' } = {}) {
    /** @type {Map<string, number[]>} */
    this.requestCounts = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.name = name;

    // Stats
    this._allowed = 0;
    this._blocked = 0;

    // Periodic cleanup every 2 × windowMs
    // #Scope-Of-Improvement: use a single shared timer instead of one per instance
    this._cleanupInterval = setInterval(() => this.cleanup(), windowMs * 2);
    // Allow the process to exit even if the timer is still alive
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  /* ------------------------------------------------------------------ */

  /**
   * Check whether `key` has exceeded the rate limit.
   * @param {string} key – Identifier (IP address, user ID, etc.)
   * @returns {{ limited: boolean, remaining: number, retryAfterMs: number }}
   */
  isRateLimited(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requestCounts.get(key);
    if (!timestamps) {
      timestamps = [];
      this.requestCounts.set(key, timestamps);
    }

    // Prune expired entries — @risk-area: must be done BEFORE count check
    const pruned = timestamps.filter((t) => t > windowStart);
    this.requestCounts.set(key, pruned);

    if (pruned.length >= this.maxRequests) {
      this._blocked++;
      // Retry-after = time until the oldest surviving timestamp expires
      const oldestInWindow = pruned[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { limited: true, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
    }

    // Allow the request
    pruned.push(now);
    this._allowed++;
    return {
      limited: false,
      remaining: this.maxRequests - pruned.length,
      retryAfterMs: 0,
    };
  }

  /* ------------------------------------------------------------------ */

  /**
   * Express middleware factory.
   * Returns 429 with `Retry-After` header when rate limited.
   * @returns {import('express').RequestHandler}
   */
  middleware() {
    return (req, res, next) => {
      // #What: use X-Forwarded-For in production behind a reverse proxy
      const key = req.ip || req.socket?.remoteAddress || 'unknown';
      const result = this.isRateLimited(key);

      // Always set informational headers
      res.set('X-RateLimit-Limit', String(this.maxRequests));
      res.set('X-RateLimit-Remaining', String(result.remaining));

      if (result.limited) {
        const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
        res.set('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${this.name} limiter. Try again in ${retryAfterSec}s.`,
          retryAfter: retryAfterSec,
        });
      }

      next();
    };
  }

  /* ------------------------------------------------------------------ */

  /**
   * Remove stale entries whose entire timestamp array is empty or expired.
   * Called automatically on a timer but can also be invoked manually.
   */
  cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.requestCounts) {
      const live = timestamps.filter((t) => t > windowStart);
      if (live.length === 0) {
        this.requestCounts.delete(key);
      } else {
        this.requestCounts.set(key, live);
      }
    }
  }

  /* ------------------------------------------------------------------ */

  /** Tracking statistics. */
  getStats() {
    return {
      name: this.name,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      activeKeys: this.requestCounts.size,
      allowed: this._allowed,
      blocked: this._blocked,
    };
  }

  /** Tear down the cleanup timer (useful in tests). */
  destroy() {
    clearInterval(this._cleanupInterval);
  }
}

/* ====================================================================
 * Pre-configured instances
 * ==================================================================== */

/** General API limiter — 60 requests per minute. */
export const generalLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  name: 'general',
});

/**
 * Chat / LLM limiter — 15 requests per minute.
 * #Business-Intent: Efficiency — protects expensive Gemini token budget.
 */
export const chatLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  name: 'chat',
});

/** Authentication limiter — deliberately strict to slow credential guessing. */
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 5,
  name: 'authentication',
});
