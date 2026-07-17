import { GRACEFUL_SHUTDOWN_TIMEOUT_MS } from './constants.js';
import logger from '../utils/logger.js';

/** Registers process signal handlers that stop timers before closing HTTP. */
export function registerGracefulShutdown(server, timers) {
  const shutdown = (signal) => {
    logger.info('Graceful shutdown initiated.', { signal });
    timers.forEach(clearInterval);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), GRACEFUL_SHUTDOWN_TIMEOUT_MS).unref?.();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}
