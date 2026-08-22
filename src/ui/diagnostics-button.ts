/**
 * The Debug menu (M14-EXT-26, growing the M14-EXT-01 controls):
 * one labelled disclosure gathering the maintainer routes —
 * copy diagnostics, download the log, email the dev — per
 * UI-STANDARDS.md → "Diagnostics affordance". The bundle it hands out
 * is the redacted one built by `src/diagnostics/bundle.ts`, on every
 * route: the email body carries a redacted headline and an
 * attach-the-download instruction, never the log itself (`mailto:`
 * cannot attach files, so the flow is download-then-email and the
 * copy says so — the app stays offline, no network call).
 *
 * Placement: the dev-only header cluster, which is the "existing dev
 * toolbar" UI-STANDARDS asks for in preference to a floating wart.
 * The disclosure is `details`/`summary` — the debug panel's house
 * pattern — with a visible text label ("Debug"), 44 px targets
 * throughout, and every route announcing its outcome in the shared
 * `role="status"` line: never a silent action.
 *
 * The copy and mail paths are injected rather than reaching for
 * `navigator.clipboard` / `window.location` directly, so the status
 * logic is testable in node and a clipboard-less browser degrades to
 * a stated failure instead of a silent one.
 */

/**
 * Where "Email the dev" addresses. Deliberately a placeholder: the
 * address ships in a public bundle, so which one to expose is the
 * owner's call — empty opens a compose window with no recipient,
 * which still works as a hand-off. No secret either way.
 */
export const DEV_EMAIL = '';

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

/** The announced line after a successful download. */
export function downloadStatusMessage(records: number, filename: string): string {
  const plural = records === 1 ? 'record' : 'records';
  return `Saved a redacted diagnostics log (${String(records)} log ${plural}) as ${filename}.`;
}

/** The announced line after the email route fires. */
export function emailStatusMessage(filename: string): string {
  return `Log saved as ${filename} — attach it to the email that just opened.`;
}

/** What the email link needs to know; all of it non-secret. */
export interface DevEmailContext {
  appVersion: string;
  buildId: string;
  records: number;
  filename: string;
}

/**
 * Build the prefilled `mailto:` URL. Subject carries the version and
 * build identity (non-secret by the versioning rule); the body is an
 * attach-the-download instruction plus the same identity — never log
 * content, so the URL cannot leak what the bundle redacts and stays
 * far inside mail clients' URL-length limits.
 */
export function devEmailUrl(context: DevEmailContext): string {
  const subject = `Pattern Mapper ${context.appVersion} (${context.buildId}) — diagnostics`;
  const body = [
    `Diagnostics from Pattern Mapper ${context.appVersion} (build ${context.buildId}).`,
    '',
    `The redacted log was just downloaded as ${context.filename} — please attach that file to this email before sending (email links cannot attach files themselves).`,
    '',
    `Log records in the bundle: ${String(context.records)}.`,
    '',
    'What happened:',
    '',
  ].join('\n');
  return `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** What the control needs from the host, injected for testability. */
export interface DiagnosticsControlDeps {
  /** Build the bundle text and report how many records it carries. */
  collect: () => { text: string; records: number };
  /** Place text on the clipboard; rejects when unavailable. */
  copy: (text: string) => Promise<void>;
  /**
   * Save the bundle as a file. Same redacted bundle as the copy path —
   * never the raw ring buffer. Optional: absent, the download and
   * email routes do not render.
   */
  download?: (text: string, filename: string) => void;
  /** App identity for the email route (non-secret). */
  identity?: { appVersion: string; buildId: string };
  /** Open a mailto URL (the hand-off to the user's mail client). */
  openMail?: (url: string) => void;
}

/** The control plus its live region, for the caller to mount. */
export interface DiagnosticsControl {
  element: HTMLElement;
  /** Exposed so a test (or a keyboard shortcut) can drive the copy. */
  run: () => Promise<void>;
}

const COPY_LABEL = 'Copy diagnostics';
const LOG_FILENAME = 'pattern-mapper-log.txt';

/**
 * Build the Debug menu. The status element is `role="status"`
 * (`aria-live="polite"`), so every route's outcome is announced to
 * assistive technology rather than only shown.
 */
export function createDiagnosticsControl(
  doc: Document,
  deps: DiagnosticsControlDeps,
): DiagnosticsControl {
  const wrapper = doc.createElement('div');
  wrapper.className = 'diagnostics-control';

  const menu = doc.createElement('details');
  menu.className = 'debug-menu';
  const menuSummary = doc.createElement('summary');
  menuSummary.textContent = 'Debug';
  const menuBody = doc.createElement('div');
  menuBody.className = 'debug-menu-body';
  menu.append(menuSummary, menuBody);

  const status = doc.createElement('p');
  status.className = 'meta';
  status.setAttribute('role', 'status');

  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = COPY_LABEL;
  // Accessible name and visible label are the same string by
  // construction; the title carries it as a tooltip too.
  button.title = COPY_LABEL;

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
  menuBody.append(button);

  if (deps.download !== undefined) {
    const downloadDeps = deps.download;
    const downloadButton = doc.createElement('button');
    downloadButton.type = 'button';
    downloadButton.textContent = 'Download log';
    downloadButton.title = 'Download log';
    downloadButton.addEventListener('click', () => {
      try {
        const { text, records } = deps.collect();
        downloadDeps(text, LOG_FILENAME);
        status.textContent = downloadStatusMessage(records, LOG_FILENAME);
      } catch (error) {
        const reason = (error instanceof Error ? error.message : String(error)).replace(/\.\s*$/, '');
        status.textContent = `Could not save the log: ${reason}.`;
      }
    });
    menuBody.append(downloadButton);

    // Email the dev (M14-EXT-26): one click downloads the redacted
    // log, then opens a prefilled compose window whose body says to
    // attach it — the honest flow, since mailto cannot attach.
    const identity = deps.identity;
    const openMail = deps.openMail;
    if (identity !== undefined && openMail !== undefined) {
      const emailButton = doc.createElement('button');
      emailButton.type = 'button';
      emailButton.textContent = 'Email the dev';
      emailButton.title = 'Email the dev';
      emailButton.addEventListener('click', () => {
        try {
          const { text, records } = deps.collect();
          downloadDeps(text, LOG_FILENAME);
          openMail(
            devEmailUrl({
              appVersion: identity.appVersion,
              buildId: identity.buildId,
              records,
              filename: LOG_FILENAME,
            }),
          );
          status.textContent = emailStatusMessage(LOG_FILENAME);
        } catch (error) {
          const reason = (error instanceof Error ? error.message : String(error)).replace(/\.\s*$/, '');
          status.textContent = `Could not prepare the email: ${reason}.`;
        }
      });
      menuBody.append(emailButton);
    }
  }

  wrapper.append(menu, status);
  return { element: wrapper, run };
}

/**
 * The production opt-in (DIAG-02): a production bundle mounts the
 * Debug menu only when the URL carries `?diag=1`. A URL parameter
 * rather than a build flag because the live site is one bundle for
 * everyone — the opt-in has to be per visit, so a tester can simply be
 * sent a link. Anything but the literal `1` is "no". Dev builds mount
 * the menu regardless.
 */
export function diagnosticsRequested(search: string): boolean {
  return new URLSearchParams(search).get('diag') === '1';
}
