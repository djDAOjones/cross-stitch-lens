/**
 * The Debug menu (M14-EXT-26, growing the M14-EXT-01 controls):
 * one labelled disclosure gathering the maintainer routes —
 * report a problem, copy diagnostics, download the log — per
 * UI-STANDARDS.md → "Diagnostics affordance". The bundle it hands out
 * is the redacted one built by `src/diagnostics/bundle.ts`, on every
 * route: the email body carries a redacted headline and an
 * attach-the-downloads instruction, never the log itself (`mailto:`
 * cannot attach files, so the flow is download-then-email and the
 * copy says so — the app stays offline, no network call).
 *
 * "Report a problem" (DIAG-02) is the tester's route, so it leads the
 * menu: one click saves the project file — the palette half of any
 * report, since its snapshot is the palette the pipeline actually ran
 * with (D174) — and the redacted log, then opens the compose window.
 * The project text arrives through a host callback rather than an
 * import, so this module never reaches into the project model and a
 * save-format change cannot break the route.
 *
 * Placement: the dev-only header cluster, which is the "existing dev
 * toolbar" UI-STANDARDS asks for in preference to a floating wart.
 * The disclosure is `details`/`summary` — the debug panel's house
 * pattern — with a visible text label ("Debug"), 44 px targets
 * throughout, and every route announcing its outcome in the shared
 * `role="status"` line: never a silent action.
 *
 * The copy, download and mail paths are injected rather than reaching
 * for `navigator.clipboard` / `window.location` directly, so the
 * status logic is testable in node and a clipboard-less browser
 * degrades to a stated failure instead of a silent one.
 */

/**
 * Where "Report a problem" addresses. A dedicated, retirable alias by
 * the owner's decision (DIAG-02): the address ships in a public
 * bundle, so it is never a personal address and never a secret — a
 * harvested alias is switched off and this line changes. Empty opens
 * a compose window with no recipient, which still works as a hand-off.
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

/**
 * The announced line after a report is prepared. Names every file the
 * tester has to attach — a browser that rations automatic downloads
 * may have held the second one back, and a named file that did not
 * arrive is noticed where an unnamed one is not.
 */
export function reportStatusMessage(projectFilename: string | null, logFilename: string): string {
  if (projectFilename === null) {
    return `Log saved as ${logFilename} — attach it to the email that just opened.`;
  }
  return `Saved ${projectFilename} and ${logFilename} — attach both to the email that just opened.`;
}

/** What the email link needs to know; all of it non-secret. */
export interface DevEmailContext {
  appVersion: string;
  buildId: string;
  records: number;
  /** The redacted log's filename. */
  filename: string;
  /** The project file saved beside the log, when the host supplied one. */
  projectFilename?: string;
}

/**
 * Build the prefilled `mailto:` URL. Subject carries the version and
 * build identity (non-secret by the versioning rule); the body is an
 * attach-the-downloads instruction plus the same identity — never log
 * or project content, so the URL cannot leak what the bundle redacts
 * and stays far inside mail clients' URL-length limits.
 */
export function devEmailUrl(context: DevEmailContext): string {
  const subject = `Pattern Mapper ${context.appVersion} (${context.buildId}) — diagnostics`;
  const attach =
    context.projectFilename === undefined
      ? `The redacted log was just downloaded as ${context.filename} — please attach that file to this email before sending (email links cannot attach files themselves).`
      : `Two files were just saved — ${context.projectFilename} (the design) and ${context.filename} (the redacted log) — please attach both to this email before sending (email links cannot attach files themselves).`;
  const body = [
    `Diagnostics from Pattern Mapper ${context.appVersion} (build ${context.buildId}).`,
    '',
    attach,
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
   * Save text as a file. Same redacted bundle as the copy path — never
   * the raw ring buffer. `type` is the blob's MIME type, plain text
   * unless asked otherwise (the project file asks for JSON). Optional:
   * absent, the download and report routes do not render.
   */
  download?: (text: string, filename: string, type?: string) => void;
  /**
   * The current project as the text Save would write, under Save's
   * filename (DIAG-02). A callback, not an import: the host owns the
   * project model and its save format, and this module depends on
   * neither. Optional: absent, a report carries the log only.
   */
  project?: () => { text: string; filename: string };
  /** App identity for the email route (non-secret). */
  identity?: { appVersion: string; buildId: string };
  /** Open a mailto URL (the hand-off to the user's mail client). */
  openMail?: (url: string) => void;
}

/** What a report needs from the host: the deps the route renders on. */
export type ReportDeps = Pick<DiagnosticsControlDeps, 'collect' | 'project'> &
  Required<Pick<DiagnosticsControlDeps, 'download' | 'identity' | 'openMail'>>;

/** The control plus its live region, for the caller to mount. */
export interface DiagnosticsControl {
  element: HTMLElement;
  /** Exposed so a test (or a keyboard shortcut) can drive the copy. */
  run: () => Promise<void>;
}

const REPORT_LABEL = 'Report a problem';
const COPY_LABEL = 'Copy diagnostics';
const DOWNLOAD_LABEL = 'Download log';
/** The redacted log's filename on every route that saves it. */
export const LOG_FILENAME = 'pattern-mapper-log.txt';

/**
 * Run a report: save the project file (when the host supplies one),
 * save the redacted log, open the compose window, and return the line
 * to announce. The project file goes first — it is the evidence that
 * matters most (D174), and a browser that rations automatic downloads
 * prompts on the second file, never the first. A failure returns a
 * stated line rather than throwing, and stops before the mail window
 * opens: a tester who reads "Could not prepare" knows there is
 * nothing to send yet.
 */
export function prepareReport(deps: ReportDeps): string {
  try {
    const project = deps.project === undefined ? null : deps.project();
    if (project !== null) deps.download(project.text, project.filename, 'application/json');
    const { text, records } = deps.collect();
    deps.download(text, LOG_FILENAME);
    deps.openMail(
      devEmailUrl({
        appVersion: deps.identity.appVersion,
        buildId: deps.identity.buildId,
        records,
        filename: LOG_FILENAME,
        ...(project === null ? {} : { projectFilename: project.filename }),
      }),
    );
    return reportStatusMessage(project === null ? null : project.filename, LOG_FILENAME);
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).replace(/\.\s*$/, '');
    return `Could not prepare the report: ${reason}.`;
  }
}

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

  // Routes in menu order: the tester's report first (DIAG-02), then
  // the maintainer's copy and download.
  const routes: HTMLButtonElement[] = [];

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

  if (deps.download !== undefined) {
    const downloadDeps = deps.download;

    // Report a problem (DIAG-02): one click saves the project file and
    // the redacted log, then opens a prefilled compose window whose
    // body says to attach both — the honest flow, since mailto cannot
    // attach.
    const identity = deps.identity;
    const openMail = deps.openMail;
    if (identity !== undefined && openMail !== undefined) {
      const reportButton = doc.createElement('button');
      reportButton.type = 'button';
      reportButton.textContent = REPORT_LABEL;
      reportButton.title = REPORT_LABEL;
      const reportDeps: ReportDeps = {
        collect: deps.collect,
        download: downloadDeps,
        identity,
        openMail,
        ...(deps.project === undefined ? {} : { project: deps.project }),
      };
      reportButton.addEventListener('click', () => {
        status.textContent = prepareReport(reportDeps);
      });
      routes.push(reportButton);
    }

    routes.push(button);

    const downloadButton = doc.createElement('button');
    downloadButton.type = 'button';
    downloadButton.textContent = DOWNLOAD_LABEL;
    downloadButton.title = DOWNLOAD_LABEL;
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
    routes.push(downloadButton);
  } else {
    routes.push(button);
  }

  menuBody.append(...routes);
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
