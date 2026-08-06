/**
 * Debug-menu pure halves (M14-EXT-26): the announced status lines and
 * the prefilled mailto URL. The invariant worth protecting is the
 * redaction boundary — the email URL must carry identity and
 * instructions only, never bundle content — plus the never-silent
 * rule that every route has an announceable outcome string.
 */

import { describe, expect, it } from 'vitest';

import {
  DEV_EMAIL,
  devEmailUrl,
  diagnosticsStatusMessage,
  downloadStatusMessage,
  emailStatusMessage,
} from '../src/ui/diagnostics-button.ts';

describe('devEmailUrl', () => {
  const context = {
    appVersion: 'v0.5.0',
    buildId: '20260806.abc1234',
    records: 12,
    filename: 'cross-stitch-lens-log.txt',
  };

  it('is a mailto URL addressed to the placeholder constant', () => {
    const url = devEmailUrl(context);
    expect(url.startsWith(`mailto:${DEV_EMAIL}?`)).toBe(true);
  });

  it('carries identity and the attach instruction, decoded intact', () => {
    const url = devEmailUrl(context);
    const query = url.slice(url.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toContain('v0.5.0');
    expect(params.get('subject')).toContain('20260806.abc1234');
    const body = params.get('body') ?? '';
    expect(body).toContain('attach that file');
    expect(body).toContain(context.filename);
    expect(body).toContain('12');
  });

  it('never embeds bundle content — identity only (redaction boundary)', () => {
    // The URL is built from four non-secret fields; a log line, token,
    // or storage dump has no path in. Guard the shape: nothing beyond
    // subject and body, and the body is instruction prose.
    const url = devEmailUrl({ ...context, records: 1 });
    const query = url.slice(url.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    expect([...params.keys()].sort()).toEqual(['body', 'subject']);
  });

  it('stays well inside mail-client URL limits', () => {
    expect(devEmailUrl(context).length).toBeLessThan(1500);
  });
});

describe('announced outcomes', () => {
  it('copy success names the redaction and the record count', () => {
    expect(diagnosticsStatusMessage({ ok: true, records: 1 })).toContain('redacted');
    expect(diagnosticsStatusMessage({ ok: true, records: 1 })).toContain('1 log record');
    expect(diagnosticsStatusMessage({ ok: true, records: 3 })).toContain('3 log records');
  });

  it('copy failure says what to do next, without doubling full stops', () => {
    const line = diagnosticsStatusMessage({ ok: false, reason: 'clipboard blocked.' });
    expect(line).toContain('clipboard blocked');
    expect(line).not.toContain('..');
    expect(line).toContain('try again');
  });

  it('download and email outcomes name the file', () => {
    expect(downloadStatusMessage(2, 'log.txt')).toContain('log.txt');
    expect(emailStatusMessage('log.txt')).toContain('log.txt');
    expect(emailStatusMessage('log.txt')).toContain('attach');
  });
});
