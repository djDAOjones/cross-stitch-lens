/**
 * "Copy diagnostics" control (UI-STANDARDS.md → "Diagnostics
 * affordance"). Copies the redacted bundle built by
 * `src/diagnostics/bundle.ts` so a maintainer can paste it to an AI
 * agent — the affordance AGENTS.md → "Self-explaining runtime" requires
 * and the M5-ACCEPT-03 rehearsal needs to record its evidence.
 *
 * Placement: inside the dev-only debug panel, which is the "existing dev
 * toolbar" UI-STANDARDS asks for in preference to a floating wart.
 *
 * Deviation from the letter of the standard, recorded deliberately: the
 * standard says *Carbon icon button with a tooltip*, but also that the
 * visible label and accessible name must match — which a bare icon
 * cannot satisfy. Every other control in this app is a text button, so
 * this is one too, with `title` and text identical. Strictly more
 * accessible than an icon, and consistent with its neighbours.
 *
 * The copy path is injected rather than reaching for
 * `navigator.clipboard` directly, so the status logic is testable in
 * node and a clipboard-less browser degrades to a stated failure
 * instead of a silent one.
 */

/** Outcome of a copy attempt; drives the announced status text. */
export type CopyOutcome =
  | { ok: true; records: number }
  | { ok: false; reason: string };

/**
 * The status line announced after a copy. Says WHAT was copied, so the
 * maintainer knows the bundle is redacted before pasting it somewhere
 * public, and never signals success or failure by colour alone.
 */
export function diagnosticsStatusMessage(outcome: CopyOutcome): string {
  if (!outcome.ok) {
    // Raw error strings often end in a full stop of their own (A19).
    const reason = outcome.reason.replace(/\.\s*$/, '');
    return `Could not copy diagnostics: ${reason}. The bundle is unchanged — try again, or copy it from the console.`;
  }
  const records = outcome.records;
  const plural = records === 1 ? 'record' : 'records';
  return `Copied a redacted diagnostics bundle (${String(records)} log ${plural}) to the clipboard.`;
}

/** What the control needs from the host, injected for testability. */
export interface DiagnosticsControlDeps {
  /** Build the bundle text and report how many records it carries. */
  collect: () => { text: string; records: number };
  /** Place text on the clipboard; rejects when unavailable. */
  copy: (text: string) => Promise<void>;
}

/** The control plus its live region, for the caller to mount. */
export interface DiagnosticsControl {
  element: HTMLElement;
  /** Exposed so a test (or a keyboard shortcut) can drive the action. */
  run: () => Promise<void>;
}

const LABEL = 'Copy diagnostics';

/**
 * Build the control. The status element is `role="status"`
 * (`aria-live="polite"`), so the outcome is announced to assistive
 * technology rather than only shown — the standard's "never a silent
 * copy" rule.
 */
export function createDiagnosticsControl(
  doc: Document,
  deps: DiagnosticsControlDeps,
): DiagnosticsControl {
  const wrapper = doc.createElement('div');
  wrapper.className = 'diagnostics-control';

  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = LABEL;
  // Accessible name and visible label are the same string by
  // construction; the title carries it as a tooltip too.
  button.title = LABEL;

  const status = doc.createElement('p');
  status.className = 'meta';
  status.setAttribute('role', 'status');

  async function run(): Promise<void> {
    // Disable across the await so a double-press cannot interleave two
    // collections and announce the first result twice.
    button.disabled = true;
    try {
      const { text, records } = deps.collect();
      await deps.copy(text);
      status.textContent = diagnosticsStatusMessage({ ok: true, records });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      status.textContent = diagnosticsStatusMessage({ ok: false, reason });
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', () => void run());
  wrapper.append(button, status);
  return { element: wrapper, run };
}
