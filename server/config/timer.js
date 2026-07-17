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
    startRecurringTask(refreshSimulation, 30_000),
    startRecurringTask(triggerRecommendationCycle, 60_000),
    startRecurringTask(cleanExpiredSessions, 300_000),
  ];
}
