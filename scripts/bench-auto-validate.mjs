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
 * Validate a **picker-granted** capture report (the Part-A′ cross-check
 * leg): the three canonical rows on a visible, untainted run. Edit
 * classes are deliberately not required — the cross-check compares the
 * canonical rows only, so the picker leg stays short.
 */
export function validatePickerCaptureReport(report) {
  const failures = coreFailures(report);
  if (failures.length > 0 && failures[0].startsWith('not a bv2')) return failures;
  const base = 'capture.g300.p64.lab.fs-s100-serp';
  requireMeasured(report, failures, base, 'preview-update', 'live window 300²');
  requireMeasured(
    report,
    failures,
    'capture.g200.p64.lab.fs-s100-serp',
    'preview-update',
    'live window 200²',
  );
  requireMeasured(report, failures, base, 'interaction', 'interaction run');
  return failures;
}

/** The nine `<workloadId>|<boundary>` windows a trace leg must pair. */
export const EXPECTED_TRACE_WINDOWS = [
  'capture.g300.p64.lab.fs-s100-serp|preview-update',
  'capture.g200.p64.lab.fs-s100-serp|preview-update',
  'capture.g300.p64.lab.fs-s100-serp|interaction',
  ...EXPECTED_EDIT_CLASSES.map(
    (editClass) => `capture.g300.p64.lab.fs-s100-serp.edit-${editClass}|preview-update`,
  ),
];

/**
 * Validate a merged trace-leg report (M13-MEAS-04): the embedded page
 * report must pass the capture-leg gate (the trace taints with it),
 * the trace buffer must not have overflowed, the bench renderer must
 * be identified, all nine windows must pair, and a leg minutes long
 * with zero GC events means the categories or the thread attribution
 * broke — refused, never published as "no GC".
 */
export function validateTraceReport(merged) {
  if (typeof merged !== 'object' || merged === null || merged.pageReport === undefined) {
    return ['not a trace-leg report (no embedded pageReport)'];
  }
  const failures = validateCaptureReport(merged.pageReport).map((f) => `page: ${f}`);
  if (merged.dataLoss !== false) {
    failures.push(
      'trace: Chrome reported trace-buffer data loss — trim categories or shorten the leg',
    );
  }
  if (merged.trace?.renderer == null) {
    failures.push('trace: bench renderer never identified (no bench: window marks found)');
  }
  const found = new Set(
    (merged.trace?.windows ?? []).map((w) => `${w.workloadId}|${w.boundary}`),
  );
  for (const key of EXPECTED_TRACE_WINDOWS) {
    if (!found.has(key)) failures.push(`trace: window ${key} missing (absent or unpaired marks)`);
  }
  const unpaired = merged.trace?.unpairedMarks ?? [];
  if (unpaired.length > 0) {
    failures.push(`trace: unpaired bench marks: ${unpaired.join(', ')}`);
  }
  const gc = merged.trace?.wholeLeg?.gc;
  const gcCount =
    (gc?.minor?.count ?? 0) + (gc?.major?.count ?? 0) + (gc?.incrementalMarking?.count ?? 0);
  if (merged.trace?.renderer != null && gcCount === 0) {
    failures.push(
      'trace: zero GC events across the whole leg — category set or thread attribution broken',
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
