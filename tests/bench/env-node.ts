/**
 * Node-side build and environment capture for a benchmark report
 * (M5-PERF-03). Kept out of `report.ts` so that module stays pure and
 * usable from a Worker; the browser reporter supplies the same shapes
 * from `navigator` instead.
 *
 * Build identity matters as much as the numbers: a median without the
 * commit that produced it cannot be compared to anything.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pkg from '../../package.json' with { type: 'json' };
import type { BuildIdentity, EnvironmentIdentity } from '../../src/bench/report.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Where JSON reports are written (gitignored — generated output). */
export const REPORT_DIR = join(ROOT, 'bench-reports');

/** The wasm pkg the bench needs for the accelerated dither backend. */
export const WASM_BYTES_PATH = join(
  ROOT,
  'crates',
  'stitch-engine',
  'pkg',
  'stitch_engine_bg.wasm',
);

/** Short commit sha, or 'nogit' outside a checkout (mirrors vite.config). */
function gitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'nogit';
  }
}

/** Build identity for this run. */
export function buildIdentity(): BuildIdentity {
  const sha = gitSha();
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return {
    appVersion: `v${pkg.version}`,
    buildId: `v${pkg.version}+${date}.${sha}`,
    gitSha: sha,
    wasmBuilt: existsSync(WASM_BYTES_PATH),
  };
}

/** Machine and runtime identity for this run. */
export function environmentIdentity(budgetMultiplier: number): EnvironmentIdentity {
  const cores = cpus();
  return {
    runtime: 'node',
    runtimeVersion: process.version,
    os: `${platform()} ${release()}`,
    arch: arch(),
    cpuModel: cores[0]?.model ?? 'unknown',
    cpuCount: cores.length,
    memoryGb: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    ci: process.env['CI'] !== undefined && process.env['CI'] !== '',
    budgetMultiplier,
  };
}

/** Write a report to the ignored output directory; returns its path. */
export function writeReport(filename: string, contents: string): string {
  mkdirSync(REPORT_DIR, { recursive: true });
  const path = join(REPORT_DIR, filename);
  writeFileSync(path, contents, 'utf8');
  return path;
}
