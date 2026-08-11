/**
 * Copy-diagnostics bundle: the redaction rules, the bundle shape, and
 * the status line the control announces.
 *
 * Redaction carries the real risk here. The bundle exists to be pasted
 * into a chat window, so a leak is a leak into someone else's logs —
 * which is why these assert the FAIL-CLOSED behaviour (values the
 * redactor cannot positively vouch for are dropped, not serialised
 * hopefully) rather than only the known-secret cases.
 */

import { describe, expect, it } from 'vitest';

import {
  BUNDLE_LOG_LIMIT,
  buildDiagnosticsBundle,
  formatDiagnosticsBundle,
  redact,
  REDACTED,
  UNVOUCHED,
  type DiagnosticsEnvironment,
} from '../src/diagnostics/bundle.ts';
import { diagnosticsStatusMessage } from '../src/ui/diagnostics-button.ts';
import type { LogRecord } from '../src/diagnostics/log.ts';

const ENV: DiagnosticsEnvironment = {
  appVersion: 'v0.5.0',
  buildId: 'v0.5.0+20260720.abc1234',
  timeZone: 'Europe/London',
  view: 'live',
  userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 15_5)',
  viewport: { width: 1512, height: 982, dpr: 2 },
  capabilities: { webgpu: true, offscreenCanvas: true, displayMedia: true },
  activeBackends: { resize: 'ts', dither: 'wasm' },
  dev: true,
};

function record(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    time: '2026-07-20T12:00:00.000Z',
    level: 'info',
    scope: 'pipeline',
    message: 'frame processed',
    ...overrides,
  };
}

describe('redaction — secret-shaped keys', () => {
  it('withholds the value of any key that names a credential', () => {
    const out = redact({
      apiKey: 'harmless-looking',
      X_Auth_Token: 'abc',
      sessionId: 'xyz',
      password: 'hunter2',
      refresh_secret: 's',
      grid: 200,
    }) as Record<string, unknown>;

    for (const key of ['apiKey', 'X_Auth_Token', 'sessionId', 'password', 'refresh_secret']) {
      expect(out[key]).toBe(REDACTED);
    }
    expect(out['grid']).toBe(200); // ordinary facts survive
  });
});

describe('redaction — secret-shaped values under innocent keys', () => {
  // The dangerous case: a credential logged under a name the key
  // pattern does not catch.
  it.each([
    ['JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij'],
    ['prefixed key', 'sk-live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'],
    ['long hex', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
    ['long base64', 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5YWJjZA=='],
  ])('withholds a %s even under the key "note"', (_name, value) => {
    expect((redact({ note: value }) as Record<string, unknown>)['note']).toBe(REDACTED);
  });

  it('does not redact ordinary diagnostic strings', () => {
    const out = redact({
      message: 'frame processed in 12.4 ms',
      hex: '#c8c8c8',
      workload: 'noise.g300x300.p64.lab.dither',
    }) as Record<string, unknown>;
    expect(out['message']).toBe('frame processed in 12.4 ms');
    expect(out['hex']).toBe('#c8c8c8');
    expect(out['workload']).toBe('noise.g300x300.p64.lab.dither');
  });
});

describe('redaction — fail closed', () => {
  it('drops a class instance rather than serialising it', () => {
    class Session {
      readonly token = 'sk-live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
      get leaky(): string {
        return this.token;
      }
    }
    expect((redact({ s: new Session() }) as Record<string, unknown>)['s']).toBe(UNVOUCHED);
  });

  it('drops functions, symbols and bigints', () => {
    const out = redact({
      fn: () => 'x',
      sym: Symbol('s'),
      big: 10n,
    }) as Record<string, unknown>;
    expect(out['fn']).toBe(UNVOUCHED);
    expect(out['sym']).toBe(UNVOUCHED);
    expect(out['big']).toBe(UNVOUCHED);
  });

  it('stops at the depth cap instead of walking unbounded structures', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
    expect(JSON.stringify(redact(deep))).toContain(UNVOUCHED);
  });

  it('survives a cycle without hanging', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic['self'] = cyclic;
    // The depth cap is what makes this terminate.
    expect(() => JSON.stringify(redact(cyclic))).not.toThrow();
  });

  it('caps long strings and wide collections', () => {
    // Spaced, so it is a long MESSAGE rather than a base64 run — an
    // unbroken 1000-char token is redacted outright, which the
    // secret-shaped-value cases above already cover.
    const long = 'stage timing exceeded budget '.repeat(60);
    expect(String((redact({ long }) as Record<string, unknown>)['long'])).toContain('[truncated]');

    const wide = Array.from({ length: 100 }, (_, i) => i);
    const out = redact({ wide }) as Record<string, unknown>;
    expect((out['wide'] as unknown[]).length).toBeLessThan(100);
  });

  it('keeps an Error legible without dragging in its stack', () => {
    const out = redact({ error: new Error('device lost') }) as Record<string, unknown>;
    expect(out['error']).toEqual({ name: 'Error', message: 'device lost' });
  });
});

describe('bundle', () => {
  it('carries build identity, environment and active backends', () => {
    const bundle = buildDiagnosticsBundle(ENV, [record()], () => new Date('2026-07-20T12:34:56Z'));
    expect(bundle.app).toBe('Pattern Mapper');
    expect(bundle.appVersion).toBe('v0.5.0');
    expect(bundle.buildId).toBe('v0.5.0+20260720.abc1234');
    expect(bundle.capturedAt).toBe('2026-07-20T12:34:56.000Z');
    expect(bundle.timeZone).toBe('Europe/London');
    expect(bundle.activeBackends).toEqual({ resize: 'ts', dither: 'wasm' });
    expect(bundle.redaction).toContain('Redacted by default');
  });

  it('lifts errors out so they are not buried in the log tail', () => {
    const logs = [
      record(),
      record({ level: 'error', scope: 'worker', message: 'request failed' }),
      record(),
    ];
    const bundle = buildDiagnosticsBundle(ENV, logs);
    expect(bundle.errors).toHaveLength(1);
    expect(bundle.errors[0]).toMatchObject({ scope: 'worker', message: 'request failed' });
  });

  it('keeps only the newest BUNDLE_LOG_LIMIT records', () => {
    const logs = Array.from({ length: BUNDLE_LOG_LIMIT + 25 }, (_, i) =>
      record({ message: `frame ${String(i)}` }),
    );
    const bundle = buildDiagnosticsBundle(ENV, logs);
    expect(bundle.logs).toHaveLength(BUNDLE_LOG_LIMIT);
    // Newest kept, oldest dropped.
    expect(bundle.logs.at(-1)?.message).toBe(`frame ${String(BUNDLE_LOG_LIMIT + 24)}`);
  });

  it('redacts log data payloads on the way in', () => {
    const bundle = buildDiagnosticsBundle(ENV, [
      record({ data: { apiKey: 'abc', totalMs: 12.4 } }),
    ]);
    expect(bundle.logs[0]?.data).toEqual({ apiKey: REDACTED, totalMs: 12.4 });
  });

  it('serialises to valid JSON containing no raw secret', () => {
    const text = formatDiagnosticsBundle(
      buildDiagnosticsBundle(ENV, [
        record({ data: { token: 'sk-live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345' } }),
      ]),
    );
    expect(() => JSON.parse(text) as unknown).not.toThrow();
    expect(text).not.toContain('sk-live_');
  });
});

describe('announced status', () => {
  it('says what was copied, and that it is redacted', () => {
    const message = diagnosticsStatusMessage({ ok: true, records: 12 });
    expect(message).toContain('redacted');
    expect(message).toContain('12 log records');
  });

  it('uses the singular for one record', () => {
    expect(diagnosticsStatusMessage({ ok: true, records: 1 })).toContain('1 log record)');
  });

  it('states the failure rather than copying silently', () => {
    const message = diagnosticsStatusMessage({
      ok: false,
      reason: 'the clipboard API is unavailable in this context',
    });
    expect(message).toContain('Could not copy');
    expect(message).toContain('clipboard API is unavailable');
  });
});
