import crypto from 'node:crypto';

export const CSRF_COOKIE = 'pulsegrid_csrf';
const CSRF_HEADER = 'x-csrf-token';

/** Issue a high-entropy double-submit token for an authenticated browser session. */
export function setCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return token;
}

/** Reject cross-site state-changing requests that cannot echo the browser's CSRF cookie. */
export function requireCsrf(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token required' });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}
