/**
 * Writes structured operational events while keeping production output concise.
 *
 * @param {'debug' | 'info' | 'warn' | 'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 * @returns {void}
 */
function write(level, message, context = {}) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;

  const event = { level, message, timestamp: new Date().toISOString(), ...context };
  const output = JSON.stringify(event);
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](output);
}

/** Environment-aware logger used by API and runtime modules. */
const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
};

export default logger;
