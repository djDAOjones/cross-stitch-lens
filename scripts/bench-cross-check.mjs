/**
 * Part-A′ cross-check helper (M13-MEAS-03): compare a **manual**
 * capture report (button 4→5→6→6b→7→8, downloaded from the harness)
 * against the **automated** canonical capture report, row by row.
 *
 *   npm run bench:crosscheck -- ~/Downloads/browser-bench-<buildId>.json
 *
 * The script does the arithmetic — same-build guard, medians, rates,
 * ratios — and prints them side by side. The judgement ("the
 * automated rows hold") stays human: the owner reads the table, and
 * the next agent session records the call in the decision log. It
 * never edits anything.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The canonical capture rows the cross-check compares. */
const COMPARED = [
  { workloadId: 'capture.g300.p64.lab.fs-s100-serp', boundary: 'preview-update', name: 'live 300²' },
  { workloadId: 'capture.g200.p64.lab.fs-s100-serp', boundary: 'preview-update', name: 'live 200²' },
  { workloadId: 'capture.g300.p64.lab.fs-s100-serp', boundary: 'interaction', name: 'interaction' },
];

/** One comparison line: manual vs automated for a canonical row. */
function compareRow(spec, manual, automated) {
  const pick = (report) =>
    report.rows.find((r) => r.workloadId === spec.workloadId && r.boundary === spec.boundary);
  const a = pick(manual);
  const b = pick(automated);
  const summarise = (row) => {
    if (row === undefined) return null;
    if (row.status !== 'measured' || row.summary === null) {
      return { missing: row.reason ?? row.status };
    }
    const rate = row.meta?.['updates/sec over window'];
    const misses = row.meta?.['changes missed'];
    return {
      medianMs: row.summary.median,
      count: row.summary.count,
      ...(typeof rate === 'number' ? { updatesPerSec: rate } : {}),
      ...(typeof misses === 'number' ? { misses } : {}),
    };
  };
  const manualSide = summarise(a);
  const automatedSide = summarise(b);
  const ratio =
    manualSide?.medianMs !== undefined && automatedSide?.medianMs !== undefined
      ? manualSide.medianMs / automatedSide.medianMs
      : null;
  return { name: spec.name, manual: manualSide, automated: automatedSide, ratio };
}

/**
 * Pure comparison over two parsed bv2 capture reports. Returns the
 * build guard verdict and one line per canonical row; throws nothing.
 */
export function compareReports(manual, automated) {
  return {
    sameBuild: manual.build?.buildId === automated.build?.buildId,
    manualBuild: String(manual.build?.buildId ?? 'unknown'),
    automatedBuild: String(automated.build?.buildId ?? 'unknown'),
    manualTainted: manual.validity?.tainted !== false,
    rows: COMPARED.map((spec) => compareRow(spec, manual, automated)),
  };
}

/** Newest canonical (unstamped) capture report in bench-reports. */
function defaultAutomatedPath() {
  const dir = 'bench-reports';
  const candidates = readdirSync(dir)
    .filter((f) => /^browser-bench-.*-capture\.json$/.test(f))
    .map((f) => join(dir, f))
    .sort((p, q) => statSync(q).mtimeMs - statSync(p).mtimeMs);
  if (candidates.length === 0) {
    throw new Error('no canonical capture report in bench-reports — run npm run bench:auto first');
  }
  return candidates[0];
}

function fmt(side) {
  if (side === null) return 'row missing';
  if (side.missing !== undefined) return `not measured (${side.missing})`;
  return (
    `${side.medianMs.toFixed(1)} ms (n=${String(side.count)})` +
    (side.updatesPerSec !== undefined ? `, ${side.updatesPerSec.toFixed(1)}/sec` : '') +
    (side.misses !== undefined ? `, ${String(side.misses)} missed` : '')
  );
}

/**
 * Human-readable comparison block, one string — shared by this CLI
 * and the launcher's `--crosscheck` mode so both print identically.
 * `manualName` names the picker-granted side ("manual" or "picker").
 */
export function formatComparison(result, manualName = 'manual') {
  const lines = [];
  for (const row of result.rows) {
    lines.push(row.name);
    lines.push(`  ${manualName}:`.padEnd(13) + fmt(row.manual));
    lines.push('  automated: ' + fmt(row.automated));
    if (row.ratio !== null) {
      lines.push(`  ${manualName}/automated median ratio: ${row.ratio.toFixed(2)}×`);
    }
  }
  lines.push(
    '\nThe call is yours: similar medians and the same updates/sec story means the\n' +
      'flag-granted rows hold. Tell the next agent session your verdict — it records\n' +
      'the cross-check in the decision log and the automated rows become canon.',
  );
  return lines.join('\n');
}

function main() {
  const manualPath = process.argv[2];
  if (manualPath === undefined) {
    console.error(
      'usage: npm run bench:crosscheck -- <manual-report.json> [automated-report.json]',
    );
    process.exitCode = 2;
    return;
  }
  const automatedPath = process.argv[3] ?? defaultAutomatedPath();
  const manual = JSON.parse(readFileSync(manualPath, 'utf8'));
  const automated = JSON.parse(readFileSync(automatedPath, 'utf8'));
  const result = compareReports(manual, automated);

  console.log(`manual:    ${manualPath} (build ${result.manualBuild})`);
  console.log(`automated: ${automatedPath} (build ${result.automatedBuild})`);
  if (!result.sameBuild) {
    console.error(
      '\n✗ DIFFERENT BUILDS — the comparison is meaningless. Redo the manual run on the current build.',
    );
    process.exitCode = 1;
    return;
  }
  if (result.manualTainted) {
    console.error(
      '\n✗ the manual report is tainted (see its findings) — redo it with every window visible.',
    );
    process.exitCode = 1;
    return;
  }
  console.log('');
  console.log(formatComparison(result));
}

// CLI entry only — the test suite imports compareReports without
// running the comparison.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
