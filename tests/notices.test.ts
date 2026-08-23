/**
 * Licences and notices (PUB-01): the node halves of the affordance,
 * per the house convention (logic in node, the button and dialog
 * verified in the running app).
 *
 * Two invariants matter here. The texts the app shows are the repo's
 * own `LICENSE` and `THIRD-PARTY-NOTICES.md`, byte for byte — the
 * whole point of a build-time import is that there is no second copy
 * to drift. And they reach the bundle at build time, never by URL:
 * a root-relative fetch is exactly what the Pages base path broke
 * (D172), so the module must not contain one.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  inlineSpans,
  NOTICE_SOURCES,
  noticeDocuments,
  parseNoticeDocument,
  type NoticeDocument,
} from '../src/ui/notices.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

/** Every word of a parsed document, headings and code spans included. */
function words(notice: NoticeDocument): string {
  return notice.blocks
    .map((block) =>
      block.kind === 'heading'
        ? block.text
        : block.spans.map((span) => span.text).join(''),
    )
    .join('\n');
}

/** The parsed document at `index`, failing loudly if it is missing. */
function document(index: number): NoticeDocument {
  const notice = noticeDocuments()[index];
  if (notice === undefined)
    throw new Error(`no notice document at ${String(index)}`);
  return notice;
}

describe('parseNoticeDocument', () => {
  it('returns an empty document for empty text', () => {
    expect(parseNoticeDocument('')).toEqual({ title: '', blocks: [] });
    expect(parseNoticeDocument('\n\n  \n')).toEqual({ title: '', blocks: [] });
  });

  it('takes the first non-blank line as the title, stripping a markdown H1', () => {
    expect(
      parseNoticeDocument('\n# Third-party notices\n\nBody.\n').title,
    ).toBe('Third-party notices');
  });

  it('keeps a plain-text first line as the title verbatim', () => {
    expect(parseNoticeDocument('Pattern Mapper — Licence\n\nBody.').title).toBe(
      'Pattern Mapper — Licence',
    );
  });

  it('turns later # lines into headings at their level', () => {
    const { blocks } = parseNoticeDocument('# T\n\n## Two\n\n### Three\n');
    expect(blocks).toEqual([
      { kind: 'heading', level: 2, text: 'Two' },
      { kind: 'heading', level: 3, text: 'Three' },
    ]);
  });

  it('reflows the lines of a paragraph into one and splits paragraphs on blank lines', () => {
    const { blocks } = parseNoticeDocument(
      'T\n\nfirst line\nsecond line\n\nnext para\n',
    );
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        spans: [{ text: 'first line second line', code: false }],
      },
      { kind: 'paragraph', spans: [{ text: 'next para', code: false }] },
    ]);
  });

  it('tolerates CRLF line endings and trims indentation', () => {
    const { title, blocks } = parseNoticeDocument('T\r\n\r\n  a\r\n  b\r\n');
    expect(title).toBe('T');
    expect(blocks).toEqual([
      { kind: 'paragraph', spans: [{ text: 'a b', code: false }] },
    ]);
  });

  it('a heading ends the paragraph before it', () => {
    const { blocks } = parseNoticeDocument('T\n\npara\n## H\nafter\n');
    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ]);
  });
});

describe('inlineSpans', () => {
  it('splits backtick spans out as code', () => {
    expect(inlineSpans('see `LICENSE` for terms')).toEqual([
      { text: 'see ', code: false },
      { text: 'LICENSE', code: true },
      { text: ' for terms', code: false },
    ]);
  });

  it('drops nothing and emits no empty spans', () => {
    expect(inlineSpans('`a``b`')).toEqual([
      { text: 'a', code: true },
      { text: 'b', code: true },
    ]);
    expect(inlineSpans('')).toEqual([]);
  });

  it('keeps an unmatched backtick as text', () => {
    expect(inlineSpans('a `b c')).toEqual([{ text: 'a `b c', code: false }]);
    expect(inlineSpans('`')).toEqual([{ text: '`', code: false }]);
  });
});

describe('the shipped documents', () => {
  it('are the repo files, byte for byte — what the app shows is what the repo says', () => {
    expect(NOTICE_SOURCES.map((source) => source.file)).toEqual([
      'LICENSE',
      'THIRD-PARTY-NOTICES.md',
    ]);
    for (const source of NOTICE_SOURCES) {
      expect(source.text).toBe(read(source.file));
    }
  });

  it('read as the licence, then the third-party notices with every component named', () => {
    expect(document(0).title).toBe('Pattern Mapper — Licence');
    const notices = document(1);
    expect(notices.title).toBe('Third-party notices');
    const headings = notices.blocks.flatMap((block) =>
      block.kind === 'heading' ? [block.text] : [],
    );
    expect(headings).toEqual([
      'pdf-lib',
      'wasm-bindgen',
      'libm (rust-lang/libm)',
      'Thread brands and colour data',
    ]);
  });

  it('carry the grant lines the dialog exists to show', () => {
    expect(words(document(0))).toContain('All rights reserved');
    // One MIT permission notice per bundled component (D161).
    const permissions = words(document(1)).match(
      /Permission is hereby granted, free of charge/g,
    );
    expect(permissions).toHaveLength(3);
    expect(words(document(1))).toContain('check a physical colour card');
  });

  it('reach the bundle at build time, never by URL (D172)', () => {
    const source = read('src/ui/notices.ts');
    expect(source).toContain("from '../../LICENSE?raw'");
    expect(source).toContain("from '../../THIRD-PARTY-NOTICES.md?raw'");
    expect(source).not.toMatch(/\bfetch\(/);
    expect(source).not.toMatch(/['"`]\/(LICENSE|THIRD-PARTY)/);
  });
});
