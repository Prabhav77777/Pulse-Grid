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
