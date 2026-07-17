/** Sliding-window in-memory request limiter. */
export class RateLimiter {
  /** @param {{ windowMs?: number, maxRequests?: number, name?: string }} [options] */
  constructor({ windowMs = 60_000, maxRequests = 30, name = 'default' } = {}) {
    this.requestCounts = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.name = name;
    this._allowed = 0;
    this._blocked = 0;
    this._cleanupInterval = setInterval(() => this.cleanup(), windowMs * 2);
    this._cleanupInterval.unref?.();
  }

  /** @param {string} key @returns {{ limited: boolean, remaining: number, retryAfterMs: number }} */
  isRateLimited(key) {
    const now = Date.now();
    const active = (this.requestCounts.get(key) || []).filter((timestamp) => timestamp > now - this.windowMs);
    this.requestCounts.set(key, active);
    if (active.length >= this.maxRequests) {
      this._blocked += 1;
      return { limited: true, remaining: 0, retryAfterMs: Math.max(active[0] + this.windowMs - now, 0) };
    }
    active.push(now);
    this._allowed += 1;
    return { limited: false, remaining: this.maxRequests - active.length, retryAfterMs: 0 };
  }

  /** @returns {import('express').RequestHandler} */
  middleware() {
    return (req, res, next) => {
      const result = this.isRateLimited(req.ip || req.socket?.remoteAddress || 'unknown');
      res.set('X-RateLimit-Limit', String(this.maxRequests));
      res.set('X-RateLimit-Remaining', String(result.remaining));
      if (!result.limited) return next();
      const retryAfter = Math.ceil(result.retryAfterMs / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too Many Requests', message: `Rate limit exceeded for ${this.name} limiter. Try again in ${retryAfter}s.`, retryAfter });
    };
  }

  /** Removes inactive request keys. */
  cleanup() {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.requestCounts) {
      const active = timestamps.filter((timestamp) => timestamp > cutoff);
      if (active.length) this.requestCounts.set(key, active);
      else this.requestCounts.delete(key);
    }
  }

  /** Returns limiter health statistics. */
  getStats() {
    return { name: this.name, windowMs: this.windowMs, maxRequests: this.maxRequests, activeKeys: this.requestCounts.size, allowed: this._allowed, blocked: this._blocked };
  }

  /** Stops background cleanup. */
  destroy() { clearInterval(this._cleanupInterval); }
}

export const generalLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 60, name: 'general' });
export const chatLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 15, name: 'chat' });
export const authLimiter = new RateLimiter({ windowMs: 900_000, maxRequests: 5, name: 'authentication' });
