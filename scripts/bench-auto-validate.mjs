/**
 * Validation for the automated owner-session reports (M13-MEAS-03) —
 * pure functions over parsed bv2 JSON, shared by the launcher
 * (`scripts/bench-auto.mjs`) and its unit test. A run is only "one
 * command yields valid reports" if these checks pass; anything less is
 * printed as a failure, never quietly written as evidence.
 *
 * Kept dependency-free and framework-free: plain data in, a list of
 * human-readable failure strings out (empty = valid).
 */

/** The six edit classes the capture report must carry rows for. */
export const EXPECTED_EDIT_CLASSES = [
  'hands-off',
  'pixel-marks',
  'slow-stroke',
  'large-fill',
  'transform',
  'rapid-scatter',
];

/** Shared checks: untainted, and the env row saw a visible page. */
function coreFailures(report) {
  const failures = [];
  if (typeof report !== 'object' || report === null || !Array.isArray(report.rows)) {
    return ['not a bv2 report (no rows array)'];
  }
  if (report.validity?.tainted !== false) {
    const findings = report.validity?.findings ?? ['(no findings recorded)'];
    failures.push(`report is tainted: ${findings.join(' ; ')}`);
  }
  const env = report.rows.find((row) => row.workloadId === 'env');
  if (env === undefined) {
    failures.push('no environment row');
  } else if (env.meta?.visibility !== 'visible') {
    failures.push(
      `the page was not visible (env visibility: ${String(env.meta?.visibility)}) — ` +
        'samples from a hidden page are throttled garbage',
    );
  }
  return failures;
}

/** One measured row by workloadId + boundary, or a failure pushed. */
function requireMeasured(report, failures, workloadId, boundary, what) {
  const row = report.rows.find(
    (r) => r.workloadId === workloadId && r.boundary === boundary,
  );
  if (row === undefined) {
    failures.push(`${what}: row ${boundary}/${workloadId} is missing`);
    return null;
  }
  if (row.status !== 'measured' || row.summary === null) {
    failures.push(
      `${what}: row ${boundary}/${workloadId} is ${row.status}` +
        (row.reason === undefined ? '' : ` — ${row.reason}`),
    );
    return null;
  }
  if (row.summary.count < 1) {
    failures.push(`${what}: row ${boundary}/${workloadId} has no samples`);
    return null;
  }
  return row;
}

/**
 * Validate the capture-leg report: both canonical live windows, the
 * interaction run, and all six edit-class windows measured on a
 * visible, untainted run.
 */
export function validateCaptureReport(report) {
  const failures = coreFailures(report);
  if (failures.length > 0 && failures[0].startsWith('not a bv2')) return failures;
  const base = 'capture.g300.p64.lab.fs-s100-serp';
  const base200 = 'capture.g200.p64.lab.fs-s100-serp';
  requireMeasured(report, failures, base, 'preview-update', 'live window 300²');
  requireMeasured(report, failures, base200, 'preview-update', 'live window 200²');
  requireMeasured(report, failures, base, 'interaction', 'interaction run');
  for (const editClass of EXPECTED_EDIT_CLASSES) {
    requireMeasured(
      report,
      failures,
      `${base}.edit-${editClass}`,
      'preview-update',
      `edit class ${editClass}`,
    );
  }
  return failures;
}

/**
 * Validate the mem report: the plateau row carries a numeric forced-GC
 * reading (the whole point of the flagged launch) and the export
 * isolation re-proof held.
 */
export function validateMemReport(report) {
  const failures = coreFailures(report);
  if (failures.length > 0 && failures[0].startsWith('not a bv2')) return failures;
  const plateau = report.rows.find((row) =>
    row.label === 'retained-heap plateau (fixed sequence)',
  );
  if (plateau === undefined) {
    failures.push('mem: the retained-heap plateau row is missing');
  } else if (typeof plateau.meta?.['heap after forced GC MiB'] !== 'number') {
    failures.push(
      'mem: no forced-GC heap reading — Chrome was not launched with --js-flags=--expose-gc',
    );
  }
  const isolation = report.rows.find((row) =>
    String(row.label).startsWith('export isolation re-proof'),
  );
  if (isolation === undefined) {
    failures.push('mem: the export isolation row is missing');
  } else if (isolation.meta?.verdict !== 'EXACT everywhere') {
    failures.push(`mem: export isolation verdict is ${String(isolation.meta?.verdict)}`);
  }
  return failures;
}
