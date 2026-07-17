const ALLOWED_LOCALES = ['en', 'es', 'fr', 'ar'];
const MAX_CHAT_LENGTH = 500;
const MAX_ACTION_NOTE_LENGTH = 500;

/** Escapes user supplied HTML before it reaches the concierge pipeline. */
function sanitizeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

/** Validates and sanitizes a concierge message. */
export function validateChatInput(req, res, next) {
  const { message } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Invalid input', details: 'Message must be a non-empty string.' });
  }
  if (message.trim().length > MAX_CHAT_LENGTH) {
    return res.status(400).json({ error: 'Invalid input', details: `Message exceeds maximum length of ${MAX_CHAT_LENGTH} characters.` });
  }
  req.body.message = sanitizeHtml(message.trim());
  next();
}

/** Validates the requested supported locale. */
export function validateLocale(req, res, next) {
  const locale = req.body?.locale || req.query?.locale || 'en';
  if (!ALLOWED_LOCALES.includes(locale)) {
    return res.status(400).json({ error: 'Invalid locale', details: `Locale must be one of: ${ALLOWED_LOCALES.join(', ')}`, allowedLocales: ALLOWED_LOCALES });
  }
  req.locale = locale;
  next();
}

/** Validates optional approval or rejection audit notes. */
export function validateRecommendationAction(req, res, next) {
  for (const field of ['notes', 'reason']) {
    if (req.body[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > MAX_ACTION_NOTE_LENGTH)) {
      return res.status(400).json({ error: 'Invalid action', details: `${field} must be a string up to ${MAX_ACTION_NOTE_LENGTH} characters.` });
    }
  }
  next();
}
