/**
 * Debug-menu pure halves (M14-EXT-26, DIAG-02): the announced status
 * lines, the prefilled mailto URL, and the report sequence. The
 * invariant worth protecting is the redaction boundary — the email URL
 * must carry identity and instructions only, never bundle or project
 * content — plus the never-silent rule that every route has an
 * announceable outcome string, and the report's ordering promise: the
 * project file first, and no mail window opened for a half-made
 * report.
 */

import { describe, expect, it } from 'vitest';

import {
  DEV_EMAIL,
  devEmailUrl,
  diagnosticsRequested,
  diagnosticsStatusMessage,
  downloadStatusMessage,
  LOG_FILENAME,
  prepareReport,
  reportStatusMessage,
  type ReportDeps,
} from '../src/ui/diagnostics-button.ts';

describe('DEV_EMAIL', () => {
  it('is empty or a well-formed address — a typo here breaks the route silently', () => {
    expect(DEV_EMAIL === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DEV_EMAIL)).toBe(true);
  });
});

describe('devEmailUrl', () => {
  const context = {
    appVersion: 'v0.5.0',
    buildId: '20260806.abc1234',
    records: 12,
    filename: 'pattern-mapper-log.txt',
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

  it('names both files when a project file was saved beside the log (DIAG-02)', () => {
    const url = devEmailUrl({ ...context, projectFilename: 'project-120x60.json' });
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    const body = params.get('body') ?? '';
    expect(body).toContain('project-120x60.json');
    expect(body).toContain(context.filename);
    expect(body).toContain('attach both');
    expect([...params.keys()].sort()).toEqual(['body', 'subject']);
  });

  it('never embeds bundle content — identity only (redaction boundary)', () => {
    // The URL is built from five non-secret fields; a log line, token,
    // or storage dump has no path in. Guard the shape: nothing beyond
    // subject and body, and the body is instruction prose.
    const url = devEmailUrl({ ...context, records: 1 });
    const query = url.slice(url.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    expect([...params.keys()].sort()).toEqual(['body', 'subject']);
  });

  it('stays well inside mail-client URL limits', () => {
    expect(devEmailUrl(context).length).toBeLessThan(1500);
    expect(
      devEmailUrl({ ...context, projectFilename: 'project-1024x1024.json' }).length,
    ).toBeLessThan(1500);
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

  it('download and report outcomes name every file to attach', () => {
    expect(downloadStatusMessage(2, 'log.txt')).toContain('log.txt');
    expect(reportStatusMessage(null, 'log.txt')).toContain('log.txt');
    expect(reportStatusMessage(null, 'log.txt')).toContain('attach');
    const both = reportStatusMessage('project-120x60.json', 'log.txt');
    expect(both).toContain('project-120x60.json');
    expect(both).toContain('log.txt');
    expect(both).toContain('attach both');
  });
});

describe('prepareReport (the one-click report, DIAG-02)', () => {
  const PROJECT_TEXT = '{"schemaVersion":9,"palette":{"snapshot":[]}}';
  const BUNDLE_TEXT = '{"app":"Pattern Mapper","logs":[]}';

  /** Fake host deps that record every call in order. */
  function host(overrides: Partial<ReportDeps> = {}): {
    deps: ReportDeps;
    calls: string[];
    mail: string[];
  } {
    const calls: string[] = [];
    const mail: string[] = [];
    const deps: ReportDeps = {
      collect: () => ({ text: BUNDLE_TEXT, records: 3 }),
      download: (_text, filename, type) => {
        calls.push(`download:${filename}:${type ?? 'text/plain'}`);
      },
      project: () => ({ text: PROJECT_TEXT, filename: 'project-120x60.json' }),
      identity: { appVersion: 'v0.5.0', buildId: 'v0.5.0+20260823.6b3d839' },
      openMail: (url) => {
        calls.push('mail');
        mail.push(url);
      },
      ...overrides,
    };
    return { deps, calls, mail };
  }

  it('saves the project file first, then the log, then opens the email', () => {
    const { deps, calls, mail } = host();
    const line = prepareReport(deps);
    expect(calls).toEqual([
      'download:project-120x60.json:application/json',
      `download:${LOG_FILENAME}:text/plain`,
      'mail',
    ]);
    expect(line).toContain('project-120x60.json');
    expect(line).toContain(LOG_FILENAME);
    expect(line).toContain('attach both');
    // The compose body names both files the tester has to attach.
    const body = new URLSearchParams(mail[0]?.slice(mail[0].indexOf('?') + 1)).get('body') ?? '';
    expect(body).toContain('project-120x60.json');
    expect(body).toContain(LOG_FILENAME);
  });

  it('carries the log alone when the host supplies no project', () => {
    const { deps, calls } = host();
    delete deps.project;
    const line = prepareReport(deps);
    expect(calls).toEqual([`download:${LOG_FILENAME}:text/plain`, 'mail']);
    expect(line).toContain(`Log saved as ${LOG_FILENAME}`);
  });

  it('never puts project or log content into the mail URL (redaction boundary)', () => {
    const { deps, mail } = host();
    prepareReport(deps);
    const url = decodeURIComponent(mail[0] ?? '');
    expect(url).not.toContain('schemaVersion');
    expect(url).not.toContain('snapshot');
    expect(url).not.toContain('"logs"');
    expect(url).toContain('v0.5.0+20260823.6b3d839');
  });

  it('states a download failure and opens no mail window for a half-made report', () => {
    const { deps, calls } = host({
      download: () => {
        throw new Error('downloads are blocked here.');
      },
    });
    const line = prepareReport(deps);
    expect(line).toContain('Could not prepare the report');
    expect(line).toContain('downloads are blocked here');
    expect(line).not.toContain('..');
    expect(calls).not.toContain('mail');
  });

  it('states a project failure before anything is saved', () => {
    const { deps, calls } = host({
      project: () => {
        throw new Error('project state unavailable');
      },
    });
    const line = prepareReport(deps);
    expect(line).toContain('Could not prepare the report');
    expect(calls).toEqual([]);
  });
});

describe('diagnosticsRequested (the production opt-in, DIAG-02)', () => {
  it('is true only for the literal ?diag=1', () => {
    expect(diagnosticsRequested('?diag=1')).toBe(true);
    expect(diagnosticsRequested('?foo=bar&diag=1')).toBe(true);
    expect(diagnosticsRequested('')).toBe(false);
    expect(diagnosticsRequested('?diag=true')).toBe(false);
    expect(diagnosticsRequested('?diag=0')).toBe(false);
    expect(diagnosticsRequested('?diagnostics=1')).toBe(false);
  });
});
