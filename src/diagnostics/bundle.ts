/**
 * Copy-diagnostics bundle (DEV-INFRASTRUCTURE.md → "Maintainer
 * diagnostics"). The snapshot a maintainer hands to an AI agent:
 * build identity, environment, active backends, and the last N
 * **redacted** log records from the ring buffer.
 *
 * Pure by construction — every environment fact is passed in rather
 * than read from `window`/`navigator` here. That keeps the redaction
 * rules, which are the part that must never be wrong, testable in node
 * without a DOM.
 *
 * **Redaction is default-on and fail-closed.** The rule is not "strip
 * the things we know are secret" but "emit only what we can positively
 * recognise as safe": known-safe primitives, inside a depth and size
 * cap, with secret-shaped keys and values replaced. Anything else — a
 * function, a class instance, a value too deep to inspect — is dropped
 * rather than serialised hopefully. This app has no secrets or PII at
 * runtime, but the affordance outlives that assumption.
 */

import type { LogRecord } from './log.ts';

/** Replacement for a value withheld by redaction. */
export const REDACTED = '[redacted]';
/** Replacement for a value redaction could not positively vouch for. */
export const UNVOUCHED = '[dropped: unrecognised type]';

/** How deep into `data` the redactor will walk before giving up. */
const MAX_DEPTH = 4;
/** Longest string emitted verbatim; longer ones are truncated. */
const MAX_STRING = 300;
/** Most array entries or object keys emitted per level. */
const MAX_ENTRIES = 32;
/** Log records included in a bundle (newest kept). */
export const BUNDLE_LOG_LIMIT = 80;

/**
 * Key names whose VALUE is never emitted, whatever it looks like.
 * Matched case-insensitively as a substring, so `apiKey`, `X-Auth-Token`
 * and `refresh_secret` are all caught.
 */
const SECRET_KEY_PATTERN =
  /(token|secret|password|passwd|auth|cookie|session|credential|bearer|apikey|api_key|private)/i;

/**
 * Value shapes that look like credentials regardless of their key: JWTs,
 * `sk-`/`ghp_`-style prefixed keys, and long unbroken base64/hex runs.
 * Deliberately eager — a false positive costs one redacted field in a
 * debug bundle, a false negative leaks a key into a pasted chat.
 */
const SECRET_VALUE_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, // JWT
  /\b(sk|pk|rk|ghp|gho|ghs|xox[baprs])[-_][A-Za-z0-9_-]{16,}/i, // prefixed keys
  /\b[A-Fa-f0-9]{32,}\b/, // long hex run
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/, // long base64 run
];

function looksSecret(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Redact one value. Returns the safe form, or `undefined` when the
 * value should be omitted entirely.
 */
function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return UNVOUCHED;
  if (value === null) return null;

  switch (typeof value) {
    case 'boolean':
      return value;
    case 'number':
      // NaN/Infinity do not survive JSON; name them rather than emit null.
      return Number.isFinite(value) ? value : String(value);
    case 'string':
      if (looksSecret(value)) return REDACTED;
      return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… [truncated]` : value;
    case 'undefined':
      return undefined;
    case 'object':
      break;
    default:
      // function, symbol, bigint — never part of a diagnostic fact.
      return UNVOUCHED;
  }

  if (Array.isArray(value)) {
    const out = value
      .slice(0, MAX_ENTRIES)
      .map((entry) => redactValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
    if (value.length > MAX_ENTRIES) out.push(`… ${String(value.length - MAX_ENTRIES)} more`);
    return out;
  }

  if (value instanceof Error) {
    return { name: value.name, message: redactValue(value.message, depth + 1) };
  }

  // Fail closed: only PLAIN objects are walked. A class instance may
  // have getters with side effects or fields we cannot reason about.
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return UNVOUCHED;

  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_ENTRIES) {
      out['…'] = 'more keys omitted';
      break;
    }
    count++;
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    const safe = redactValue(entry, depth + 1);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

/** Redact a log record's free-form `data` payload. */
export function redact(value: unknown): unknown {
  return redactValue(value, 0);
}

/** Environment facts the caller reads from the host and passes in. */
export interface DiagnosticsEnvironment {
  appVersion: string;
  buildId: string;
  /** IANA zone, e.g. "Europe/London" — pairs with the ISO timestamp. */
  timeZone: string;
  /** Which view the app is showing; "still" or "live" for this app. */
  view: string;
  userAgent: string;
  viewport: { width: number; height: number; dpr: number };
  /** Feature detection, not preference: what the runtime actually offers. */
  capabilities: Record<string, boolean>;
  /** Backend that last ran each stage, e.g. `{ dither: 'wasm' }`. */
  activeBackends: Record<string, string>;
  /** True for a dev build; a production bundle needs an explicit opt-in. */
  dev: boolean;
}

/** The copied snapshot. Every field is redaction-safe by construction. */
export interface DiagnosticsBundle {
  app: string;
  appVersion: string;
  buildId: string;
  capturedAt: string;
  timeZone: string;
  view: string;
  userAgent: string;
  viewport: { width: number; height: number; dpr: number };
  capabilities: Record<string, boolean>;
  activeBackends: Record<string, string>;
  dev: boolean;
  /** Errors lifted out of the log so they are not buried in the tail. */
  errors: { time: string; scope: string; message: string }[];
  logs: { time: string; level: string; scope: string; message: string; data?: unknown }[];
  redaction: string;
}

const APP_NAME = 'Pattern Mapper';

const REDACTION_NOTICE =
  'Redacted by default: secret-shaped keys and values are replaced, ' +
  'non-plain objects are dropped rather than serialised, and strings are ' +
  'truncated. Contains no credentials, cookies, request bodies, storage ' +
  'contents or personal data. Review before sharing publicly.';

/**
 * Build the bundle from the ring buffer and the caller's environment
 * facts. `logs` is trimmed to the newest {@link BUNDLE_LOG_LIMIT}
 * records; every `data` payload goes through {@link redact}.
 */
export function buildDiagnosticsBundle(
  env: DiagnosticsEnvironment,
  logs: readonly LogRecord[],
  now: () => Date = () => new Date(),
): DiagnosticsBundle {
  const recent = logs.slice(-BUNDLE_LOG_LIMIT);
  return {
    app: APP_NAME,
    appVersion: env.appVersion,
    buildId: env.buildId,
    capturedAt: now().toISOString(),
    timeZone: env.timeZone,
    view: env.view,
    userAgent: env.userAgent,
    viewport: env.viewport,
    capabilities: env.capabilities,
    activeBackends: env.activeBackends,
    dev: env.dev,
    errors: recent
      .filter((record) => record.level === 'error')
      .map((record) => ({
        time: record.time,
        scope: record.scope,
        message: record.message,
      })),
    logs: recent.map((record) => {
      const safe = record.data === undefined ? undefined : redact(record.data);
      return {
        time: record.time,
        level: record.level,
        scope: record.scope,
        message: record.message,
        ...(safe === undefined ? {} : { data: safe }),
      };
    }),
    redaction: REDACTION_NOTICE,
  };
}

/** The bundle as the text actually placed on the clipboard. */
export function formatDiagnosticsBundle(bundle: DiagnosticsBundle): string {
  return JSON.stringify(bundle, null, 2);
}
