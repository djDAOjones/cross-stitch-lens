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

/** Ring-buffer capacity; oldest entries evicted beyond this. */
const BUFFER_CAPACITY = 200;

const buffer: LogRecord[] = [];

function write(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const record: LogRecord = {
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data === undefined ? {} : { data }),
  };
  buffer.push(record);
  if (buffer.length > BUFFER_CAPACITY) buffer.shift();
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
export function installGlobalCapture(target: Window): void {
  target.addEventListener('error', (event) => {
    log.error('global', 'uncaught error', {
      message: event.message,
      source: `${event.filename}:${String(event.lineno)}:${String(event.colno)}`,
    });
  });
  target.addEventListener('unhandledrejection', (event) => {
    log.error('global', 'unhandled rejection', { reason: String(event.reason) });
  });
}
