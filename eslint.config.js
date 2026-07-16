import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['server/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['server/api/middleware.js'],
    // Express error middleware needs four parameters; the final slot is intentionally unused.
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['server/reasoning/conciergeChat.js'],
    // This sanitizer intentionally removes control characters before LLM processing.
    rules: { 'no-control-regex': 'off' },
  },
];
