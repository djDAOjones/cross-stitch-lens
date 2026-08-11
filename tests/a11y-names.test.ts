/**
 * Every control has an accessible name (A11Y-01, D157).
 *
 * The automatable half of the screen-reader pass, split from
 * A11Y-VO-01: a machine can assert a control *has* a name, which leaves
 * the human judging only whether the name is any good — a short
 * VoiceOver crawl instead of a long one. `ui-styles.test.ts` set the
 * pattern this follows: source-level assertions holding the structural
 * half of an invariant whose behavioural half lives in the browser.
 *
 * **Why source-scan, not DOM.** The test environment is node with no
 * DOM implementation installed, and A11Y-01 forbids a new dependency.
 * So this walks the source for every raw interactive-element creation
 * (`createElement('button' | 'input' | 'select' | 'textarea')`) and
 * requires a recognised name-wiring signal near the site:
 *
 * - `v.textContent = …` (buttons carrying their own label)
 * - `v.setAttribute('aria-label' | 'aria-labelledby', …)`
 * - label association — `htmlFor = v.id`, or `v.id = X` with
 *   `htmlFor = X` nearby (literal, identifier, or template: matched
 *   textually)
 * - a named child — `v.append(w)` where `w.textContent` is set nearby
 * - exemptions that remove the element from the accessibility tree:
 *   `v.hidden = true`, `aria-hidden`
 * - `v.title = …` (a name source, though a poor one — whether it is
 *   *good* is exactly A11Y-VO-01's half)
 *
 * **This is a tripwire, not a proof.** A heuristic window cannot follow
 * every data flow; what it guarantees is that every current site was
 * audited (the sweep ran clean at 66/66 on 2026-08-11) and that a NEW
 * control built without name wiring beside it fails loudly, naming its
 * file and line. If a future site wires its name in a way the scanner
 * cannot see, extend the signals or — last resort — add the site to
 * REVIEWED_EXCEPTIONS with the reason a reader can check.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Sites verified by hand where the scanner cannot see the wiring. */
const REVIEWED_EXCEPTIONS: readonly string[] = [
  // (empty — every current site's wiring is scanner-visible)
];

/**
 * Files outside the product UI. The bench harness page is a
 * measurement surface driven by scripts, not a user surface; its
 * controls are not part of the app's accessibility contract.
 */
const EXCLUDED = ['src/bench-browser.ts'];

function walk(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(rel);
    return rel.endsWith('.ts') ? [rel] : [];
  });
}

interface Site {
  file: string;
  line: number;
  kind: string;
  variable: string;
}

/** Scan one file; return the sites that carry no recognised wiring. */
function unnamedSites(file: string): { sites: Site[]; total: number } {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const src = lines.join('\n');
  const decl =
    /(?:const|let)\s+(\w+)\s*=\s*(?:doc|document)\.createElement\((['"`])(button|input|select|textarea)\2\)/g;
  const sites: Site[] = [];
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = decl.exec(src)) !== null) {
    total++;
    const variable = match[1] ?? '';
    const kind = match[3] ?? '';
    const line = src.slice(0, match.index).split('\n').length;
    // The label is often declared just above the control, so the
    // window looks both ways: 10 lines back, 45 forward.
    const win = lines.slice(Math.max(0, line - 11), line - 1 + 45).join('\n');

    const direct = [
      `${variable}.textContent`,
      `${variable}.setAttribute('aria-label'`,
      `${variable}.setAttribute("aria-label"`,
      `${variable}.setAttribute('aria-labelledby'`,
      `${variable}.setAttribute("aria-labelledby"`,
      `${variable}.hidden = true`,
      `${variable}.setAttribute('aria-hidden'`,
      `${variable}.title =`,
      // A label pointing at the element's own id property.
      `htmlFor = ${variable}.id`,
    ];
    let named = direct.some((signal) => win.includes(signal));

    // Label association through a shared id expression: `v.id = X` with
    // `htmlFor = X` nearby, X matched textually so literals,
    // identifiers, and template literals all count.
    if (!named) {
      const idAssign = win.match(new RegExp(`${variable}\\.id = (.+?);`));
      if (idAssign !== null && win.includes(`htmlFor = ${idAssign[1] ?? ''}`)) named = true;
    }

    // The accordion pattern: the button's name is an appended child
    // whose textContent is set beside it.
    if (!named) {
      for (const appended of win.matchAll(new RegExp(`${variable}\\.append\\((\\w+)`, 'g'))) {
        if (win.includes(`${appended[1] ?? ''}.textContent`)) named = true;
      }
    }

    if (!named) sites.push({ file, line, kind, variable });
  }
  return { sites, total };
}

describe('accessible names (A11Y-01)', () => {
  const files = walk('src').filter((f) => !EXCLUDED.includes(f));
  let grandTotal = 0;
  const flagged: string[] = [];
  for (const file of files) {
    const { sites, total } = unnamedSites(file);
    grandTotal += total;
    for (const site of sites) {
      const id = `${site.file}:${String(site.line)} <${site.kind}> ${site.variable}`;
      if (!REVIEWED_EXCEPTIONS.includes(id)) flagged.push(id);
    }
  }

  it('every raw control creation site wires an accessible name beside it', () => {
    // A failure names the site: wire a label there (or extend the
    // scanner's signals if the wiring is real but invisible to it).
    expect(flagged).toEqual([]);
  });

  it('the scanner is still finding the control surface (self-test)', () => {
    // If a refactor renamed the creation idiom, this scan would match
    // nothing and the assertion above would pass vacuously. The app has
    // ~66 sites; a collapse below 50 means the scanner broke, not that
    // the controls left.
    expect(grandTotal).toBeGreaterThan(50);
  });

  it('exceptions are not allowed to rot', () => {
    // An exception for a site that no longer exists must be deleted,
    // so the list can only shrink toward its intended empty state.
    for (const exception of REVIEWED_EXCEPTIONS) {
      const [file] = exception.split(':');
      expect(files).toContain(file ?? '');
    }
  });
});
