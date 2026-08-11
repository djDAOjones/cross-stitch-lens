/**
 * The transcript exporter's redaction is applied, not promised
 * (DOCS-01, D159). `_transcripts/README.md` commits to transcripts
 * never landing unredacted; these pin the scrub rules a regression
 * would silently drop — a leaked key shape in a saved transcript is a
 * leak into whatever chat window it gets pasted into.
 */

import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain .mjs module, typed by its JSDoc only.
import { redactText, renderTranscript, RESULT_HEAD } from '../scripts/save-transcript.mjs';

describe('redactText', () => {
  it('scrubs every check-secrets key shape', () => {
    const text = [
      'an sk-abcdefghijklmnopqrstuvwx here',
      'an AKIAABCDEFGHIJKLMNOP there',
      'a ghp_abcdefghijklmnopqrstuvwxyz012345 token',
      '-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----',
    ].join('\n');
    const out = redactText(text) as string;
    expect(out).not.toContain('sk-abcdefghijklmnopqrstuvwx');
    expect(out).not.toContain('AKIAABCDEFGHIJKLMNOP');
    expect(out).not.toContain('ghp_');
    expect(out).not.toContain('BEGIN RSA PRIVATE KEY');
    expect(out.match(/\[redacted:/g)?.length).toBe(4);
  });

  it('elides data URIs and long base64 runs', () => {
    const b64 = 'A'.repeat(240);
    const out = redactText(`before data:image/png;base64,QUJD/+== after ${b64} end`) as string;
    expect(out).not.toContain('base64,QUJD');
    expect(out).not.toContain(b64);
    expect(out).toContain('[binary elided]');
  });

  it('leaves ordinary prose alone', () => {
    const prose = 'The reduce stage maps to DMC 310 via the LUT.';
    expect(redactText(prose)).toBe(prose);
  });
});

describe('renderTranscript', () => {
  const lines = [
    { type: 'queue-operation', operation: 'enqueue' }, // meta — dropped
    { type: 'user', timestamp: 't1', message: { role: 'user', content: 'hello sk-abcdefghijklmnopqrstuvwx' } },
    {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'working on it' },
          { type: 'thinking', thinking: 'private reasoning' }, // never evidence
          { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          { type: 'tool_result', content: `output ${'x'.repeat(RESULT_HEAD * 2)}` },
          { type: 'image', source: {} },
        ],
      },
    },
    { type: 'user', isSidechain: true, message: { role: 'user', content: 'subagent noise' } },
  ];
  const md = renderTranscript(lines, 'abc-123') as string;

  it('keeps the dialogue and drops meta, sidechains and thinking', () => {
    expect(md).toContain('## User · t1');
    expect(md).toContain('working on it');
    expect(md).not.toContain('subagent noise');
    expect(md).not.toContain('private reasoning');
    expect(md).not.toContain('enqueue');
  });

  it('redacts inside the dialogue and elides the heavy payloads', () => {
    expect(md).not.toContain('sk-abcdefghijklmnopqrstuvwx');
    expect(md).toContain('[redacted:');
    expect(md).toContain('chars elided]');
    expect(md).toContain('[image elided]');
    expect(md).toContain('**Bash**');
  });

  it('says on its face that redaction was applied and sharing still needs a read', () => {
    expect(md).toContain('redaction applied');
    expect(md).toContain('read before sharing');
  });
});
