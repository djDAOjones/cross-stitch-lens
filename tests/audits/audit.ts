/**
 * Shared plumbing for the M5B component audits (M5-PERF-10…19).
 *
 * The audits are measurement, not implementation: each one decomposes a
 * cost the bv1 matrix reports as a single number, or reproduces a defect
 * the code reading suggested. They are gated behind `AUDIT=1`
 * (`npm run audit`) for the same reason the benchmark is gated behind
 * `BENCH=1` — the quality gate must stay fast — and they reuse the
 * M5-PERF-01/02/03 harness so an audit row is taken under the same
 * boundary contract as the matrix it explains.
 *
 * Every audit writes a markdown table to the log and a JSON artefact to
 * `bench-reports`, so a finding quoted in `docs/performance-evidence.md`
 * can be traced to
 * the run that produced it.
 */

import { readFileSync } from 'node:fs';

import { registerWasmDither } from '../../src/backends/wasm/dither.ts';
import { log } from '../../src/diagnostics/log.ts';
import { setSelectedBackend } from '../../src/worker/backend-select.ts';
import { BOUNDARY_VERSION } from '../../src/bench/boundaries.ts';
import {
  buildIdentity,
  environmentIdentity,
  WASM_BYTES_PATH,
  writeReport,
} from '../bench/env-node.ts';
import { measure, planFor } from '../../src/bench/harness.ts';
import { summarise, type Summary } from '../../src/bench/report.ts';

/** True when the audits should actually run (`npm run audit`). */
export const AUDIT = process.env['AUDIT'] === '1';

/** Audit cases sweep whole matrices at 1024²; give them room. */
export const AUDIT_TIMEOUT_MS = 900_000;

/**
 * Register the wasm dither backend and route dither to it, mirroring
 * what the worker does at startup. Audits that quote a share-of-frame
 * must run the backend production runs, or the denominator is wrong.
 * Returns the backend actually in force.
 */
export async function useProductionBackends(): Promise<'ts' | 'wasm'> {
  if (!buildIdentity().wasmBuilt) return 'ts';
  const registered = await registerWasmDither(readFileSync(WASM_BYTES_PATH));
  if (!registered) return 'ts';
  setSelectedBackend('dither', 'wasm');
  return 'wasm';
}

/** One measured decomposition row. */
export interface AuditRow {
  /** What was timed, or what was counted. */
  label: string;
  /** Distribution over the timed samples; null for counted rows. */
  summary: Summary | null;
  /** Free-form evidence columns (counts, bytes, ratios, verdicts). */
  notes: Record<string, string | number>;
}

/** A complete audit: one ticket's worth of evidence. */
export interface AuditReport {
  ticket: string;
  question: string;
  rows: AuditRow[];
  findings: string[];
}

/**
 * Time `fn` under the shared harness and return a row. `expectedMs`
 * only picks the run plan (it is never reported), matching the
 * benchmark's policy so audit and matrix rows are warmed alike.
 */
export function timed(
  label: string,
  fn: () => unknown,
  expectedMs: number,
  notes: Record<string, string | number> = {},
): AuditRow {
  const plan = planFor(expectedMs);
  const samples = measure(fn, plan);
  return { label, summary: summarise(samples), notes: { warmup: plan.warmup, ...notes } };
}

/** A counted (not timed) row — allocations, candidate counts, verdicts. */
export function counted(
  label: string,
  notes: Record<string, string | number>,
): AuditRow {
  return { label, summary: null, notes };
}

/** Round to `places` decimals — audit tables are read, not diffed. */
export function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Render one audit as a markdown table, ready to paste into evidence. */
export function formatAudit(report: AuditReport): string {
  const columns = new Set<string>();
  for (const row of report.rows) for (const key of Object.keys(row.notes)) columns.add(key);
  const extras = [...columns];
  const header = ['measurement', 'median ms', 'p95 ms', 'n', ...extras];
  const lines = [
    `### ${report.ticket} — ${report.question}`,
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ];
  for (const row of report.rows) {
    const cells = [
      row.label,
      row.summary === null ? '—' : String(round(row.summary.median, 3)),
      row.summary === null ? '—' : String(round(row.summary.p95, 3)),
      row.summary === null ? '—' : String(row.summary.count),
      ...extras.map((key) => String(row.notes[key] ?? '')),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  if (report.findings.length > 0) {
    lines.push('', 'Findings:', ...report.findings.map((f) => `- ${f}`));
  }
  return lines.join('\n');
}

/**
 * Log an audit and persist it beside the benchmark reports. Build and
 * environment identity are stamped in for the same reason the matrix
 * stamps them: a median without its machine and commit is not evidence.
 */
export function publishAudit(report: AuditReport): string {
  log.info('audit', `\n${formatAudit(report)}`);
  const artefact = {
    schemaVersion: 1,
    boundaryVersion: BOUNDARY_VERSION,
    startedAt: new Date().toISOString(),
    build: buildIdentity(),
    environment: environmentIdentity(1),
    ...report,
  };
  const path = writeReport(
    `audit-${report.ticket.toLowerCase()}-${buildIdentity().gitSha}.json`,
    `${JSON.stringify(artefact, null, 2)}\n`,
  );
  log.info('audit', `artefact written: ${path}`);
  return path;
}
