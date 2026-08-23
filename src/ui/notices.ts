/**
 * Licences and notices reachable from the app (PUB-01 — D161's
 * remainder, made real by the deploy of D172): the root `LICENSE` and
 * `THIRD-PARTY-NOTICES.md` are imported at build time as text and
 * shown in a Close-only Carbon dialog from one header control.
 *
 * Build-time import, not fetch: the bundle carries the documents
 * themselves, so the live site needs no extra file under its base
 * path (nothing root-relative, per D172) and the app stays fully
 * offline. The texts are the repo's own files — `tests/notices.test.ts`
 * pins them byte for byte — so a licence edit ships with the next
 * build and there is no second copy to forget.
 *
 * The documents render as headings and reflowed paragraphs rather
 * than a `<pre>` dump: the verbatim MIT texts are hard-wrapped at
 * ~75 columns, which in a preformatted block would force horizontal
 * scrolling inside the 24 rem dialog at the 320 px companion
 * baseline. Reflowing keeps every word and only normalises line
 * breaks.
 */

import licenceText from '../../LICENSE?raw';
import noticesText from '../../THIRD-PARTY-NOTICES.md?raw';

import { formModal } from './modal.ts';

/** One run of text inside a paragraph; `code` marks a backtick span. */
export interface NoticeSpan {
  text: string;
  code: boolean;
}

/** A parsed block: a heading at its markdown level, or a reflowed paragraph. */
export type NoticeBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; spans: readonly NoticeSpan[] };

/** A parsed document: its title line plus the blocks beneath it. */
export interface NoticeDocument {
  /** The first non-blank line, a leading `# ` stripped. */
  title: string;
  blocks: readonly NoticeBlock[];
}

/** Visible label of the header control — also its accessible name. */
export const NOTICES_LABEL = 'Licences';

/** Dialog heading: names what the two documents are together. */
export const NOTICES_TITLE = 'Licences and notices';

/**
 * The documents the dialog shows, in reading order — the licence,
 * then the third-party notices — each with the repo path it was
 * imported from, so a test can hold the text to the file.
 */
export const NOTICE_SOURCES: readonly { file: string; text: string }[] = [
  { file: 'LICENSE', text: licenceText },
  { file: 'THIRD-PARTY-NOTICES.md', text: noticesText },
];

/**
 * Split a paragraph into plain and backtick-code spans. An unmatched
 * backtick stays as text: the notices say "see `LICENSE`", and a
 * stray tick must never swallow the rest of a sentence.
 */
export function inlineSpans(text: string): NoticeSpan[] {
  const parts = text.split('`');
  // An even part count means an odd number of ticks — the last one is
  // unmatched, so its tail is glued back onto the preceding text.
  if (parts.length % 2 === 0) {
    const tail = parts.pop() ?? '';
    const last = parts.length - 1;
    parts[last] = `${parts[last] ?? ''}\`${tail}`;
  }
  const spans: NoticeSpan[] = [];
  parts.forEach((part, index) => {
    if (part.length > 0) spans.push({ text: part, code: index % 2 === 1 });
  });
  return spans;
}

/**
 * Parse one notice document — plain text, or the light markdown the
 * notices file uses. The rules are deliberately few: the first
 * non-blank line is the title (a leading `# ` stripped); a later line
 * opening with `#`s is a heading at that level; blank lines separate
 * paragraphs, and the lines inside a paragraph join with single
 * spaces. Nothing else is interpreted, so the licence wording reaches
 * the screen unchanged.
 */
export function parseNoticeDocument(text: string): NoticeDocument {
  let title = '';
  let titled = false;
  const blocks: NoticeBlock[] = [];
  let paragraph: string[] = [];
  const flush = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: inlineSpans(paragraph.join(' ')) });
    paragraph = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!titled) {
      titled = true;
      title = heading === null ? line : (heading[2] ?? '');
      continue;
    }
    if (heading !== null) {
      flush();
      blocks.push({
        kind: 'heading',
        level: (heading[1] ?? '#').length,
        text: heading[2] ?? '',
      });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return { title, blocks };
}

/** The parsed documents, in {@link NOTICE_SOURCES} order. */
export function noticeDocuments(): NoticeDocument[] {
  return NOTICE_SOURCES.map((source) => parseNoticeDocument(source.text));
}

/**
 * Render one document as a section under the dialog's h2: its title
 * as an h3, the file's own `##` headings as h4 (deeper levels step
 * down with them, never past h6), paragraphs with code spans as
 * `code`. Returns the h3 as well so the dialog can focus it.
 */
function renderDocument(
  doc: Document,
  notice: NoticeDocument,
): { section: HTMLElement; heading: HTMLElement } {
  const section = doc.createElement('section');
  const heading = doc.createElement('h3');
  heading.textContent = notice.title;
  // Programmatic-only focus target (out of the tab order): the dialog
  // opens with focus here so it starts scrolled to the top — focusing
  // Close, its only control, would scroll the text to its end.
  heading.tabIndex = -1;
  section.append(heading);
  for (const block of notice.blocks) {
    if (block.kind === 'heading') {
      const sub = doc.createElement(`h${String(Math.min(6, block.level + 2))}`);
      sub.textContent = block.text;
      section.append(sub);
      continue;
    }
    const paragraph = doc.createElement('p');
    for (const span of block.spans) {
      if (span.code) {
        const code = doc.createElement('code');
        code.textContent = span.text;
        paragraph.append(code);
      } else {
        paragraph.append(doc.createTextNode(span.text));
      }
    }
    section.append(paragraph);
  }
  return { section, heading };
}

/**
 * Open the notices dialog: Close-only (`formModal`, there is nothing
 * to cancel), Escape and the backdrop close it, and focus returns to
 * the invoker. The dialog itself is the scroll container, so the
 * reading keys scroll the text whichever element inside holds focus.
 * Resolves when it closes.
 */
export function openNotices(doc: Document): Promise<void> {
  return formModal(doc, {
    title: NOTICES_TITLE,
    build: (body) => {
      const wrapper = doc.createElement('div');
      wrapper.className = 'notices';
      let first: HTMLElement | null = null;
      for (const notice of noticeDocuments()) {
        const { section, heading } = renderDocument(doc, notice);
        wrapper.append(section);
        first ??= heading;
      }
      body.append(wrapper);
      return first;
    },
  });
}

/**
 * The header control: a ghost button for the shell bar's utility row,
 * after Source — a legal link reads as subordinate to the product
 * action beside it, keeps the full 44 px target, and costs the header
 * no height (the M14-EXT-39 economy). Visible label and accessible
 * name are the same string by construction.
 */
export function createNoticesButton(doc: Document): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'licences-button';
  button.className = 'button-ghost';
  button.textContent = NOTICES_LABEL;
  button.addEventListener('click', () => void openNotices(doc));
  return button;
}
