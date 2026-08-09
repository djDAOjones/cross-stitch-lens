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

/**
 * The bv2 bindability amendment (M13-IMPL-02, signed at M13-SYNTH-01 —
 * D135). Before it, no browser row could carry a product target at all:
 * `docs/measurement-contract.md` bound budgets only to node rows,
 * because the browser numbers of the day came from hand-run rehearsals
 * whose environment nobody could re-establish.
 *
 * The automated capture leg changed that — a driven **base** window is
 * reproducible: a controlled same-origin source painting on a fixed
 * schedule, content-verified before any row is measured, on a
 * quiet-gated desktop with visibility asserted. Those rows, and only
 * those, may bind.
 *
 * Two kinds of row stay permanently unbindable, and
 * {@link assertBindable} enforces it rather than trusting the table:
 *
 * - `.edit-<class>` rows drive the source at the *class's* own cadence,
 *   not the promise's, so their medians answer a different question;
 * - anything measured against real Photoshop, whose content and timing
 *   nobody controls. Those figures stay M13-ACCEPT-02 corroboration.
 *
 * `interaction` is deliberately absent: the double-rAF protocol race
 * (2–3 of 8 attempts missed) and the absence of a real start mark would
 * make a bound p95 noise. It stays published, not bound (D135).
 */
export const BROWSER_TARGETS = new Map([
  [
    'capture.g300.p64.lab.fs-s100-serp|preview-update',
    { ms: 41.0, tolerance: 1.35, runtime: 'Chrome, Apple M1 Max', taken: 'v0.5.0+20260808.3bfe7ef' },
  ],
  [
    'capture.g200.p64.lab.fs-s100-serp|preview-update',
    { ms: 31.2, tolerance: 1.35, runtime: 'Chrome, Apple M1 Max', taken: 'v0.5.0+20260808.3bfe7ef' },
  ],
]);

/**
 * The product promise itself, asserted as a sustained rate rather than
 * a latency percentile: the driven leg commands changes at 4 /sec and
 * every one of them must produce a visible update. A median that looks
 * fast while frames are being dropped is not the promise being kept,
 * which is why the miss counters bind alongside the rate.
 */
export const CADENCE_TARGET = { updatesPerSec: 4 };

/** Rows that may never carry a product target, whatever a table says. */
function assertBindable(key, failures) {
  if (key.includes('.edit-')) {
    failures.push(
      `contract: ${key} is an edit-class row — it is driven at its class's own ` +
        'cadence and can never carry a product target (bv2 amendment, D135)',
    );
  }
  if (!key.startsWith('capture.')) {
    failures.push(
      `contract: ${key} is not a driven capture row — only the automated leg's ` +
        'base windows are product-target-bindable (bv2 amendment, D135)',
    );
  }
}

/**
 * Product-target checks over a capture report: the cadence promise on
 * each driven base window, and the guarded `preview-update` medians.
 *
 * A missing counter fails rather than passes — the promise is not
 * "no misses were reported", it is "misses were counted and there were
 * none". An absent field means the harness stopped answering, and a
 * silent zero there is exactly the green-washing D43 forbids.
 */
function productTargetFailures(report) {
  const failures = [];
  for (const [key, target] of BROWSER_TARGETS) {
    assertBindable(key, failures);
    const [workloadId, boundary] = key.split('|');
    const row = report.rows.find(
      (r) => r.workloadId === workloadId && r.boundary === boundary,
    );
    // Presence is already gated by validateCaptureReport; skip quietly
    // so one missing row yields one failure, not two.
    if (row === undefined || row.status !== 'measured' || row.summary === null) continue;

    const ceiling = target.ms * target.tolerance;
    if (row.summary.median > ceiling) {
      failures.push(
        `target: ${key} median ${row.summary.median.toFixed(2)} ms exceeds ` +
          `${ceiling.toFixed(2)} ms (baseline ${target.ms.toFixed(2)} ms ` +
          `×${String(target.tolerance)}, ${target.runtime}, ${target.taken})`,
      );
    } else if (row.summary.median < target.ms / 2) {
      failures.push(
        `target: ${key} median ${row.summary.median.toFixed(2)} ms is over 2× faster ` +
          `than its baseline ${target.ms.toFixed(2)} ms — good news, but the guard has ` +
          'gone slack; re-record the baseline',
      );
    }

    const rate = row.meta?.['updates/sec over window'];
    if (typeof rate !== 'number') {
      failures.push(`target: ${key} has no 'updates/sec over window' reading`);
    } else if (rate < CADENCE_TARGET.updatesPerSec) {
      failures.push(
        `target: ${key} sustained ${String(rate)} updates/sec, below the promised ` +
          `${String(CADENCE_TARGET.updatesPerSec)} /sec`,
      );
    }

    for (const counter of ['rvfc missed callbacks', 'window pump drops', 'window client drops']) {
      const value = row.meta?.[counter];
      if (typeof value !== 'number') {
        failures.push(`target: ${key} has no '${counter}' count`);
      } else if (value > 0) {
        failures.push(`target: ${key} recorded ${String(value)} ${counter} — the cadence missed`);
      }
    }
  }
  return failures;
}

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
 * visible, untainted run — then the M13-IMPL-02 product targets on the
 * two driven base windows.
 *
 * This is the leg the product promise binds to, so a target miss exits
 * the launcher non-zero exactly as a structural failure does. The
 * report is written before validation either way: a miss is recorded
 * evidence, never a reason to discard the run.
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
  failures.push(...productTargetFailures(report));
  return failures;
}

/**
 * Validate a **picker-granted** capture report (the Part-A′ cross-check
 * leg): the three canonical rows on a visible, untainted run. Edit
 * classes are deliberately not required — the cross-check compares the
 * canonical rows only, so the picker leg stays short.
 *
 * Product targets are deliberately not asserted here either. The
 * amendment bound the *automated* leg (D135), and this leg exists to
 * test that leg's granting path against a hand-picked one (D131) — its
 * job is agreement with the canon, measured by `bench-cross-check.mjs`,
 * not a second independent verdict on the promise.
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
 * Validate the backend-comparison report (M13-PROF-03's leg, re-run for
 * M13-ACCEPT-01): every cell that compares two backends agreed exactly,
 * and both fallback probes passed.
 *
 * Most real defects here already taint the report — the leg pushes
 * findings on mismatch and `assembleReport` folds findings into
 * `validity.tainted`. These checks are the second line: they fail a
 * report whose rows *say* DISAGREES or FAIL even if the finding never
 * got pushed, and they refuse a leg that measured nothing at all. A
 * backend suite that silently ran zero comparison cells would otherwise
 * be indistinguishable from one where every cell agreed.
 */
export function validateBackendReport(report) {
  const failures = coreFailures(report);
  if (failures.length > 0 && failures[0].startsWith('not a bv2')) return failures;

  // Any row comparing two backends carries its verdict under one of
  // these keys; all of them must read EXACT.
  const comparisonKeys = [
    'output vs other side',
    'output vs routed ts',
    'pixel verdict',
    'verdict',
  ];
  let compared = 0;
  for (const row of report.rows) {
    for (const key of comparisonKeys) {
      const value = row.meta?.[key];
      if (value === undefined) continue;
      if (value === 'EXACT' || value === 'PASS') {
        compared++;
      } else if (value === 'DISAGREES' || value === 'FAIL') {
        failures.push(
          `backend: ${String(row.label)} (${String(row.workloadId)}) reports ${key} = ${String(value)}`,
        );
      }
      // Anything else ('not captured', a retention sentence) is not a
      // comparison verdict — leave it to the leg's own findings.
    }
  }
  if (compared === 0) {
    failures.push(
      'backend: no comparison cell reported a verdict — the leg measured nothing',
    );
  }

  for (const [what, needle] of [
    ['unregistered-backend fallback', 'forced unregistered webgpu'],
    ['non-FS capability clamp', 'forced wasm, non-FS method'],
  ]) {
    const row = report.rows.find((r) => String(r.label).includes(needle));
    if (row === undefined) failures.push(`backend: the ${what} probe row is missing`);
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
