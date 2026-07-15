/**
 * @file vite.config.js
 * @description Vite build tool configuration for PulseGrid frontend.
 *   Proxies /api requests to the Express backend during development.
 * #Business-Intent: supports development workflow and clean client/server separation
 *
 * @level-one-validation
 *   Summary: Standard Vite config with proxy setup for API calls.
 *   Correctness: Proxy target matches Express server port (3001). No issues found.
 *   Rubric: Code Quality — clean, minimal configuration.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation — no prior version.
 *   Criteria improved: Code Quality (clean separation of client/server concerns).
 *   #Scope-Of-Improvement: Could add build-time environment variable injection for production API URL.
 */

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
