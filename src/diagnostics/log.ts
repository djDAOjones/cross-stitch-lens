/**
 * Structured logger (DEV-INFRASTRUCTURE.md → "Maintainer diagnostics").
 *
 * The one entry point for notable runtime behaviour: writes to the
 * console AND a bounded in-memory ring buffer that the (future)
 * copy-diagnostics affordance reads. Never log secrets, tokens, or
 * PII — this app has none at runtime, but the rule stands.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** One log record. `data` must already be redaction-safe. */
export interface LogRecord {
  time: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

/** Ring-buffer capacity; entries evicted beyond this (see `evictOne`). */
export const BUFFER_CAPACITY = 200;

const buffer: LogRecord[] = [];

/**
 * Evict one record, preferring noise over faults (DIAG-01).
 *
 * A plain `shift()` drops the oldest record whatever it is, so a burst
 * of routine chatter can push the very error you opened the diagnostics
 * for out of the buffer. Errors are what the bundle exists to carry, so
 * they are evicted last: drop the oldest non-error if there is one, and
 * only fall back to the oldest record once the buffer is all errors.
 *
 * Capacity is 200, so the scan is bounded and runs only on overflow.
 */
function evictOne(): void {
  const oldestNonError = buffer.findIndex((record) => record.level !== 'error');
  buffer.splice(oldestNonError === -1 ? 0 : oldestNonError, 1);
}

function write(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const record: LogRecord = {
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data === undefined ? {} : { data }),
  };
  buffer.push(record);
  if (buffer.length > BUFFER_CAPACITY) evictOne();
  // eslint-disable-next-line no-console -- the logger is the one sanctioned console writer
  console[level](`[${scope}] ${message}`, ...(data === undefined ? [] : [data]));
}

export const log = {
  debug: (scope: string, message: string, data?: unknown) => write('debug', scope, message, data),
  info: (scope: string, message: string, data?: unknown) => write('info', scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => write('warn', scope, message, data),
  error: (scope: string, message: string, data?: unknown) => write('error', scope, message, data),
};

/** Snapshot of recent records (newest last) for the diagnostics bundle. */
export function recentLogs(): readonly LogRecord[] {
  return [...buffer];
}

/**
 * Funnel uncaught errors and unhandled rejections into the logger so
 * nothing fails silently (AGENTS.md → "Self-explaining runtime").
 * Call once from the app entry point.
 */
/**
 * Browser notifications that arrive as `error` events but are not
 * faults (DIAG-01). Each needs a stated reason — this list is a
 * silencer, so anything added to it must be genuinely benign, not
 * merely noisy or inconvenient.
 *
 * - **ResizeObserver loop** — fired when observer callbacks resize
 *   their own targets and the browser defers the remainder to the next
 *   frame. The specification treats this as a notification, not a
 *   failure, and every major engine emits it during ordinary responsive
 *   layout. Seen throughout the 2026-08-09 acceptance sitting, where it
 *   cost real time to establish it was nothing.
 *
 * Matched as a prefix so engine-specific suffixes still match.
 */
const BENIGN_ERROR_MESSAGES = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
];

/** Is this `error` event a known-benign browser notification? */
function isBenignNotification(message: string): boolean {
  return BENIGN_ERROR_MESSAGES.some((benign) => message.startsWith(benign));
}

export function installGlobalCapture(target: Window): void {
  target.addEventListener('error', (event) => {
    const source = `${event.filename}:${String(event.lineno)}:${String(event.colno)}`;
    // Downgraded, not dropped: still visible when you go looking, but
    // no longer competing with real faults for buffer space or for the
    // reader's attention.
    if (isBenignNotification(event.message)) {
      log.debug('global', 'benign browser notification', {
        message: event.message,
        reason: 'known non-fault; see BENIGN_ERROR_MESSAGES',
      });
      return;
    }
    // A stack is what makes an uncaught error actionable; without it the
    // record says something broke but not where.
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    log.error('global', 'uncaught error', {
      message: event.message,
      source,
      ...(stack === undefined ? {} : { stack }),
    });
  });
  target.addEventListener('unhandledrejection', (event) => {
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;
    log.error('global', 'unhandled rejection', {
      reason: String(event.reason),
      ...(stack === undefined ? {} : { stack }),
    });
  });
}
