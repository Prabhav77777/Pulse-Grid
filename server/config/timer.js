/**
 * Starts a recurring asynchronous task and prevents overlapping executions.
 *
 * @param {() => void | Promise<void>} task
 * @param {number} intervalMs
 * @returns {NodeJS.Timeout}
 */
export function startRecurringTask(task, intervalMs) {
  let isRunning = false;

  return setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await task();
    } finally {
      isRunning = false;
    }
  }, intervalMs);
}

/** Starts all non-request operational refresh tasks. */
export function startOperationalTimers({ refreshSimulation, triggerRecommendationCycle, cleanExpiredSessions }) {
  return [
    startRecurringTask(refreshSimulation, SIMULATION_REFRESH_INTERVAL_MS),
    startRecurringTask(triggerRecommendationCycle, RECOMMENDATION_REFRESH_INTERVAL_MS),
    startRecurringTask(cleanExpiredSessions, SESSION_CLEANUP_INTERVAL_MS),
  ];
}
import {
  RECOMMENDATION_REFRESH_INTERVAL_MS,
  SESSION_CLEANUP_INTERVAL_MS,
  SIMULATION_REFRESH_INTERVAL_MS,
} from './constants.js';

/** Coordinates non-request background maintenance tasks. */
