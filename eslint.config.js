import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Directories src/core/ may never import from (AGENTS.md → "Engine
 * purity"): the rule matches both relative ("../worker/…") and
 * absolute ("src/worker/…") spellings.
 */
const CORE_FORBIDDEN_DIRS = [
  '**/backends/**',
  '**/capture/**',
  '**/diagnostics/**',
  '**/export/**',
  '**/ui/**',
  '**/worker/**',
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'crates/**',
      '_user-guff/**',
      'pm_skills/**',
      '.githooks/**',
      // Gitignored measurement output; a probe script dropped there must
      // not turn the gate red (INFRA-02).
      'bench-reports/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // One structured logger, no scattered console writes (AGENTS.md
      // → "Self-explaining runtime"); log.ts carries the one disable.
      'no-console': 'error',
    },
  },
  {
    // Core isolation (conventions.md): src/core/ imports nothing
    // outside src/core/ — no packages, no other layers, no DOM/Worker
    // globals. Enforced here, not by convention.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: CORE_FORBIDDEN_DIRS,
              message: 'src/core/ must not import from other layers.',
            },
            {
              regex: '^[^./]',
              message: 'src/core/ must not import packages.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'self',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'fetch',
        'XMLHttpRequest',
        'Worker',
        'postMessage',
      ],
    },
  },
  {
    // Node-context files (config, scripts): console IS the output
    // channel for CLI scripts, so the app-wide no-console rule is off.
    files: ['vite.config.ts', 'scripts/**/*.mjs'],
    languageOptions: {
      // WebSocket is a Node ≥ 22 runtime global (engines pin 22.18) —
      // there is no `node:` module to import it from (bench-cdp.mjs).
      globals: { process: 'readonly', console: 'readonly', WebSocket: 'readonly' },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
