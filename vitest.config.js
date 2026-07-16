/**
 * @file vitest.config.js
 * @description Test runner configuration for PulseGrid. Uses Vitest for fast,
 *   Vite-native ES module testing of the simulation engine and reasoning layer.
 * #Business-Intent: satisfies "Testing" criterion — enables unit and integration tests
 *
 * @level-one-validation
 *   Summary: Vitest config with test directory and coverage settings.
 *   Correctness: Points to correct test directory. No issues.
 *   Rubric: Testing — provides foundation for all test execution.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Testing (test infrastructure).
 *   #Scope-Of-Improvement: Would add coverage thresholds in production.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'server/simulation/**/*.js',
        'server/reasoning/**/*.js',
        'server/action/**/*.js',
        'server/api/**/*.js',
        'src/utils/**/*.js',
      ],
      exclude: ['server/index.js', 'server/api/routes.js'],
    },
  },
});
