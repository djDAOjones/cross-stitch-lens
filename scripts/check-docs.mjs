#!/usr/bin/env node
// @ts-check

/**
 * check-docs.mjs — Markdown integrity checks for this repo, in one pass:
 *
 *   1. LINKS — every relative Markdown link target `[text](target)`
 *      resolves to a real file on disk.
 *   2. PATHS — every backticked inline repo path (e.g.
 *      `pm_skills/prompts/release.md`) resolves on disk.
 *
 * Replaces the former check-links.mjs + check-paths.mjs pair (they
 * duplicated their file-listing and reporting scaffolding). The
 * scaffold copy `pm_skills/scaffold/check-links.mjs` is a separate,
 * generic fork by design — see CONTRIBUTING.md.
 *
 * Why this exists: the framework's primary rot risk is broken internal
 * cross-references (a prompt renamed, a path moved) — not external
 * URLs. Zero dependencies; no full-tree walk (stalls on cloud-synced /
 * on-demand filesystems).
 *
 * Scope and deliberate non-goals:
 * - Inline links only (`[text](target)`); reference-style links are
 *   not used in this repo. External targets and `#anchor` fragments
 *   are skipped (anchor slug rules cause false positives).
 * - PATHS checks only inline code spans containing a `/` with a strict
 *   charset; bare filenames, commands, globs, URLs, and placeholder
 *   patterns are skipped.
 * - PATHS skips append-only sources (`pm_skills/CHANGELOG.md`, the
 *   decision log, and everything under `pm_skills/project/archive/`):
 *   old entries legitimately name files that no longer exist
 *   (renamed/merged/superseded later). Their links are still checked.
 * - Template/example paths that never exist here (archive/, tickets/)
 *   are ignored.
 *
 * Inputs: tracked + non-ignored `*.md` files via `git ls-files`, so
 * `node_modules/` is excluded for free. The repo's living memory
 * (`self/`) IS checked; only its cold storage is excluded — the
 * frozen pre-adoption archive, and evaluations/transcripts, which
 * carry exported `file://` links and Hub-repo paths that are not
 * checkable references here.
 *
 * Exit code: 0 when everything resolves; 1 otherwise (gates CI).
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Matches inline Markdown links: captured group 1 is the raw target. */
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

/** Link targets with these prefixes are external/non-file and skipped. */
const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', '//'];

/** Inline code spans: captured group 1 is the span's content. */
const CODE_SPAN_RE = /`([^`]+)`/g;

/** Known file extensions that mark a token as a file path. */
const FILE_EXT_RE = /\.(md|mjs|js|json|jsonc|ya?ml)$/;

/** Strict path charset: letters, digits, dot, slash, hyphen, underscore. */
const SAFE_PATH_RE = /^[\w./-]+$/;

/**
 * Path patterns that are documented templates/examples, not real files
 * in this repo: on-demand memory stores that ship blank — archives and
 * per-item ticket detail files.
 *
 * `bench-reports/` is a third class: machine-specific measurement output
 * that .gitignore keeps out of the repo on purpose ("never commit the raw
 * files"), so the evidence docs cite reports that exist only on the
 * machine that ran them. A clean checkout — CI, or a cloud session — has
 * no `bench-reports/`, so checking those citations asserted the checkout
 * was the author's laptop and broke the CI-parity rule. Generated output
 * the gate itself produces earlier in the run (`dist/`, from `check:build`)
 * stays checked: it is present by the time this step runs.
 *
 * `crates/stitch-engine/pkg/` is gitignored generated output too, but
 * unlike `dist/` it is not always present by this step: `check:wasm`
 * builds it only where the Rust toolchain is installed (it skips
 * elsewhere by design), and `check:docs` is also run on its own, where
 * nothing has built it at all. Citing the folder is a statement about
 * the build, not a reference that can rot (INFRA-02).
 */
const IGNORE = [
  /(^|\/)archive(\/|$)/,
  /(^|\/)tickets(\/|$)/,
  /^bench-reports(\/|$)/,
  /^crates\/stitch-engine\/pkg(\/|$)/,
];

/**
 * Source files whose backticked paths are NOT checked (append-only
 * history naming legitimately-removed files). Links are still checked.
 */
// Append-only historical records legitimately reference paths that no
// longer exist; their backticked paths are not validated.
const PATH_SOURCE_EXCLUDE = new Set([
  'pm_skills/CHANGELOG.md',
  'pm_skills/project/decision-log.md',
]);

/**
 * Directory prefixes under the same append-only rule as the files
 * above. `pm_skills/project/archive/` holds content pruned out of the
 * hot memory files and is never rewritten, so an old entry naming a
 * since-deleted path is a correct historical record, not rot.
 */
const PATH_SOURCE_EXCLUDE_PREFIXES = ['pm_skills/project/archive/'];

/** True when a file's backticked paths are exempt from validation. */
function skipPathCheck(file) {
  return (
    PATH_SOURCE_EXCLUDE.has(file) ||
    PATH_SOURCE_EXCLUDE_PREFIXES.some((prefix) => file.startsWith(prefix))
  );
}

/**
 * Directories whose files are not checked at all: distributed
 * framework docs (framework-class, never edited here; they may
 * reference paths that only exist in the framework source repo).
 * Project memory under pm_skills/project/ IS checked.
 */
const FILE_EXCLUDE = [
  /^pm_skills\/(?!project\/)/,
];

/**
 * Bases a repo path may be written relative to: the repo root, or
 * inside `pm_skills/` (framework docs use both forms).
 */
const BASES = [process.cwd(), resolve('pm_skills')];

/**
 * List the Markdown files to check: everything Git tracks, plus new
 * files Git does not ignore, never anything gitignored. Using Git
 * avoids a recursive filesystem walk.
 * @returns {string[]} repo-relative paths to each checkable `*.md` file
 */
function markdownFiles() {
  const tracked = execSync('git ls-files "*.md"', { encoding: 'utf8' });
  const untracked = execSync(
    'git ls-files --others --exclude-standard "*.md"',
    { encoding: 'utf8' },
  );
  return [
    ...new Set(
      `${tracked}\n${untracked}`
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
    .filter((f) => existsSync(f)) // staged deletions linger in ls-files
    .filter((f) => !FILE_EXCLUDE.some((re) => re.test(f)));
}

/**
 * Normalise a raw link target into a checkable filesystem path, or
 * null when external, an in-page anchor, or empty.
 * @param {string} rawTarget the text captured between `(` and `)`
 * @returns {string|null}
 */
function linkPath(rawTarget) {
  let target = rawTarget.trim().split(/\s+/)[0]; // drop `"Title"`
  target = target.replace(/^<|>$/g, '');
  if (!target) return null;
  if (target.startsWith('#')) return null; // same-page anchor
  if (EXTERNAL_PREFIXES.some((p) => target.startsWith(p))) return null;
  target = target.split('#')[0].split('?')[0];
  return target || null;
}

/**
 * Decide whether an inline-code token is a checkable repo path; return
 * the cleaned path or null.
 * @param {string} raw the content of one inline code span
 * @returns {string|null}
 */
function codePath(raw) {
  let t = raw.trim();
  if (!t.includes('/')) return null; // bare name: ambiguous, skip
  if (/\s/.test(t)) return null; // command line, not a path
  if (t.includes('://') || t.startsWith('http')) return null; // URL
  if (/[*<>?]/.test(t)) return null; // glob or placeholder
  if (t.includes('..')) return null; // out-of-tree relative example
  if (/NNNN|X\.Y\.Z/.test(t)) return null; // doc placeholder
  if (/(^|\/)[A-Z]\.\w+$/.test(t)) return null; // single-letter placeholder
  t = t.split('#')[0].replace(/:\d+(-\d+)?$/, '');
  t = t.replace(/[.,;:)]+$/, '').replace(/^[("']+/, '');
  if (!t || !SAFE_PATH_RE.test(t)) return null;
  const looksFile = FILE_EXT_RE.test(t);
  const looksDir = t.endsWith('/');
  if (!looksFile && !looksDir) return null;
  if (IGNORE.some((re) => re.test(t))) return null;
  return t.replace(/\/$/, '');
}

/**
 * Line number of a regex match within content (1-indexed).
 * @param {string} content
 * @param {number} index
 * @returns {number}
 */
function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * Find every broken link and missing inline path in one file.
 * @param {string} file repo-relative path to the Markdown file
 * @returns {{file: string, line: number, kind: string, target: string}[]}
 */
function problemsIn(file) {
  const content = readFileSync(file, 'utf8');
  const baseDir = dirname(file);
  /** @type {{file: string, line: number, kind: string, target: string}[]} */
  const problems = [];

  for (const m of content.matchAll(LINK_RE)) {
    const target = linkPath(m[1]);
    if (target === null) continue;
    if (existsSync(resolve(baseDir, target))) continue;
    problems.push({ file, line: lineOf(content, m.index), kind: 'broken link', target });
  }

  if (!skipPathCheck(file)) {
    for (const m of content.matchAll(CODE_SPAN_RE)) {
      const target = codePath(m[1]);
      if (target === null) continue;
      if (BASES.some((base) => existsSync(resolve(base, target)))) continue;
      problems.push({ file, line: lineOf(content, m.index), kind: 'missing path', target });
    }
  }

  return problems;
}

/** Run both checks over every checkable Markdown file and report. */
function main() {
  const files = markdownFiles();
  console.log(`check-docs: ${files.length} file(s)`);
  /** @type {{file: string, line: number, kind: string, target: string}[]} */
  const problems = [];
  for (const file of files) problems.push(...problemsIn(file));

  for (const p of problems) {
    console.error(`${p.file}:${p.line} ${p.kind} -> ${p.target}`);
  }
  console.log(`Summary: ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

main();
