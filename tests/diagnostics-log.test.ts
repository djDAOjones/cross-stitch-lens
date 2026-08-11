/**
 * The structured logger's global capture and its buffer eviction
 * (DIAG-01).
 *
 * The invariant worth protecting: the diagnostics buffer exists to
 * carry the fault you opened it for. Two ways that fails — a routine
 * browser notification logged AT error level so it looks like a fault,
 * and a burst of chatter evicting the real error before anyone reads it
 * — and this suite pins both, plus the stack that makes an uncaught
 * error actionable in the first place.
 *
 * Runs in the `node` environment (vite.config.ts), so `Window` is a
 * hand-rolled double: only `addEventListener` is exercised, and holding
 * the handlers is the whole point.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BUFFER_CAPACITY,
  installGlobalCapture,
  log,
  recentLogs,
  type LogRecord,
} from '../src/diagnostics/log.ts';

type Handler = (event: unknown) => void;

/** Minimal `Window` double that records the handlers installed on it. */
function fakeWindow(): { target: Window; fire: (type: string, event: unknown) => void } {
  const handlers = new Map<string, Handler>();
  const target = {
    addEventListener: (type: string, handler: Handler) => {
      handlers.set(type, handler);
    },
  } as unknown as Window;
  return {
    target,
    fire: (type, event) => {
      const handler = handlers.get(type);
      if (handler === undefined) throw new Error(`no handler installed for "${type}"`);
      handler(event);
    },
  };
}

/** An `ErrorEvent`-shaped payload; only the read fields matter. */
function errorEvent(message: string, error?: unknown): unknown {
  return { message, filename: 'app.js', lineno: 12, colno: 3, error };
}

/** Records this test added, newest last — the buffer is module-global. */
function since(mark: number): readonly LogRecord[] {
  return recentLogs().slice(mark);
}

/** The logger writes to the console by design; keep test output clean. */
beforeEach(() => {
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('global capture — benign notifications (DIAG-01)', () => {
  it('downgrades the ResizeObserver loop notification below error', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    fire('error', errorEvent('ResizeObserver loop completed with undelivered notifications.'));

    const added = since(mark);
    expect(added).toHaveLength(1);
    // The whole point: it is not an error, so it must not be logged as one.
    expect(added[0]?.level).toBe('debug');
    expect(added[0]?.message).toBe('benign browser notification');
  });

  it('matches the other engines’ wording of the same notification', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    fire('error', errorEvent('ResizeObserver loop limit exceeded'));

    expect(since(mark)[0]?.level).toBe('debug');
  });

  it('states a reason rather than silently dropping it', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    fire('error', errorEvent('ResizeObserver loop completed with undelivered notifications'));

    const data = since(mark)[0]?.data as { message?: string; reason?: string } | undefined;
    // Downgraded, not dropped — still findable when you go looking.
    expect(data?.reason).toBeTruthy();
    expect(data?.message).toContain('ResizeObserver');
  });

  it('does not silence a real error that merely mentions ResizeObserver', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    // Prefix matching, so a genuine fault whose message happens to
    // contain the phrase later on is untouched.
    fire('error', errorEvent('TypeError: ResizeObserver loop completed is not a function'));

    expect(since(mark)[0]?.level).toBe('error');
  });
});

describe('global capture — real faults keep their evidence (DIAG-01)', () => {
  it('logs an uncaught error with message, source and stack', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    const error = new Error('boom');
    error.stack = 'Error: boom\n    at somewhere (app.js:12:3)';
    fire('error', errorEvent('Uncaught Error: boom', error));

    const added = since(mark);
    expect(added[0]?.level).toBe('error');
    const data = added[0]?.data as { message?: string; source?: string; stack?: string };
    expect(data.message).toBe('Uncaught Error: boom');
    expect(data.source).toBe('app.js:12:3');
    // Without a stack the record says something broke but not where.
    expect(data.stack).toContain('at somewhere');
  });

  it('omits the stack rather than inventing one when there is no Error', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    fire('error', errorEvent('Script error.', undefined));

    const data = since(mark)[0]?.data as { stack?: string };
    expect(data.stack).toBeUndefined();
  });

  it('carries the stack through an unhandled rejection too', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    const reason = new Error('rejected');
    reason.stack = 'Error: rejected\n    at promise (app.js:40:1)';
    fire('unhandledrejection', { reason });

    const added = since(mark);
    expect(added[0]?.level).toBe('error');
    const data = added[0]?.data as { reason?: string; stack?: string };
    expect(data.reason).toContain('rejected');
    expect(data.stack).toContain('at promise');
  });

  it('still reports a non-Error rejection reason', () => {
    const mark = recentLogs().length;
    const { target, fire } = fakeWindow();
    installGlobalCapture(target);

    fire('unhandledrejection', { reason: 'plain string reason' });

    const data = since(mark)[0]?.data as { reason?: string; stack?: string };
    expect(data.reason).toBe('plain string reason');
    expect(data.stack).toBeUndefined();
  });
});

describe('buffer eviction prefers noise over faults (DIAG-01)', () => {
  it('keeps an error when chatter overflows the buffer', () => {
    log.error('probe', 'the fault worth keeping');
    // Overflow the buffer several times over with routine chatter. A
    // plain shift() would have dropped the error long before this.
    for (let i = 0; i < BUFFER_CAPACITY * 2; i++) {
      log.info('probe', `chatter ${String(i)}`);
    }

    const kept = recentLogs().filter((r) => r.message === 'the fault worth keeping');
    expect(kept).toHaveLength(1);
    expect(recentLogs().length).toBeLessThanOrEqual(BUFFER_CAPACITY);
  });

  it('falls back to evicting the oldest once the buffer is all errors', () => {
    for (let i = 0; i < BUFFER_CAPACITY; i++) {
      log.error('flood', `error ${String(i)}`);
    }
    const before = recentLogs();
    expect(before.every((r) => r.level === 'error')).toBe(true);

    log.error('flood', 'newest error');
    const after = recentLogs();
    // Bounded is bounded: errors do not grow the buffer without limit.
    expect(after.length).toBeLessThanOrEqual(BUFFER_CAPACITY);
    expect(after.at(-1)?.message).toBe('newest error');
    expect(after.some((r) => r.message === 'error 0')).toBe(false);
  });
});
