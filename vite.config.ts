/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

/**
 * The wasm-pack output, aliased so dev/build/test succeed without the
 * Rust toolchain: when the pkg is missing the alias points at a stub
 * and `__WASM_AVAILABLE__` turns the adapter into a logged no-op
 * (DEV-INFRASTRUCTURE.md → "Build system").
 */
const WASM_PKG = fileURLToPath(
  new URL('./crates/stitch-engine/pkg/stitch_engine.js', import.meta.url),
);
const WASM_AVAILABLE = existsSync(WASM_PKG);
const WASM_STUB = fileURLToPath(
  new URL('./src/backends/wasm/stub.ts', import.meta.url),
);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __BUILD_ID__: JSON.stringify(buildId()),
    __WASM_AVAILABLE__: JSON.stringify(WASM_AVAILABLE),
  },
  resolve: {
    alias: {
      'stitch-engine-wasm': WASM_AVAILABLE ? WASM_PKG : WASM_STUB,
    },
  },
  server: {
    // Honour a harness-assigned port (parallel sessions); default 5173.
    port: Number(process.env['PORT']) || 5173,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      // `bench.html` is the production-build measurement harness
      // (src/bench-browser.ts). It must be built the same way the app
      // is — minified and optimised — because measuring TS against
      // WebGPU on a dev-server build is exactly what made the D47
      // figures unusable (M5-PERF-23's gate).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        bench: fileURLToPath(new URL('./bench.html', import.meta.url)),
        // The controlled interaction source the harness captures
        // (M13-MEAS-02) — same-origin so its BroadcastChannel paint
        // marks reach the harness.
        benchSource: fileURLToPath(new URL('./bench-source.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Liveness guards, not perf assertions (perf budgets live in `bench`,
    // outside `check` — D43/D44). The Vitest 5 s default has only ~5.6×
    // headroom over the suite's slowest healthy test (889 ms), and a
    // QoS-demoted gate under a loaded desktop measurably inflates
    // per-test wall 10–35× (INFRA-CHECK-01, D136): starvation must slow
    // the gate, never fail it. 30 s still catches genuine hangs.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
