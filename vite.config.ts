/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

/**
 * Build identity (DEV-INFRASTRUCTURE.md → "Version management"):
 * product version from package.json, build id
 * `v<version>+YYYYMMDD.shortsha` pinning the exact commit. Falls back
 * to "nogit" when git metadata is unavailable (e.g. a tarball build).
 */
function buildId(): string {
  let sha = 'nogit';
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout — keep the fallback */
  }
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `v${pkg.version}+${date}.${sha}`;
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  server: {
    // Honour a harness-assigned port (parallel sessions); default 5173.
    port: Number(process.env['PORT']) || 5173,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
