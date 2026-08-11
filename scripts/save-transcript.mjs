/**
 * save-transcript.mjs — export a Claude Code session as redacted
 * markdown into `_transcripts/` (DOCS-01, D159).
 *
 * `AGENTS.md` asks for sessions to be saved as evidence for
 * prompt-tuning, and for 26 days the ritual produced zero transcripts
 * because saving was manual. The investigation found the sessions this
 * project runs on (Claude Code) persist locally as plain JSONL under
 * `~/.claude/projects/<cwd-slug>/<session-id>.jsonl` — so the missing
 * piece was one command, not a data source. (The Claude *Desktop*
 * app's own storage is Chromium blobs and stays unusable; that half of
 * the original suspicion was right.)
 *
 * Usage:
 *   node scripts/save-transcript.mjs              # list this project's sessions
 *   node scripts/save-transcript.mjs <id-prefix>  # export one to _transcripts/
 *   node scripts/save-transcript.mjs --dir <slug> [id-prefix]
 *     # reach another slug — e.g. sessions from before the D150 rename
 *     # live under the old `...-Cross-Stitch-Lens` directory name.
 *
 * Redaction is APPLIED here, never promised for later (the
 * `_transcripts/README.md` contract). The rules, in order:
 *   - credential shapes (the check-secrets patterns) → `[redacted: …]`
 *   - data: URIs and base64 runs → `[binary elided]`
 *   - image content blocks → `[image elided]`
 *   - tool results truncated to a head — a transcript is evidence of
 *     the *dialogue*; full tool dumps are where screen content hides
 *   - the home directory → `~`
 * The output stays gitignored regardless: redaction here is a floor,
 * and the human read before any sharing is still the rule.
 */

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

/** Same shapes as scripts/check-secrets.mjs, applied not just scanned. */
const KEY_PATTERNS = [
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g },
];

/** Longest tool-result head kept; the rest is elided with a count. */
export const RESULT_HEAD = 400;
/** Longest tool-input head kept. */
export const INPUT_HEAD = 300;

/** Scrub one string: keys, binary payloads, the home path. */
export function redactText(text) {
  let out = text;
  for (const { name, re } of KEY_PATTERNS) {
    out = out.replace(re, `[redacted: ${name}]`);
  }
  // data: URIs and long base64 runs are payloads, not prose.
  out = out.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, '[binary elided]');
  out = out.replace(/\b[A-Za-z0-9+/]{200,}={0,2}\b/g, '[binary elided]');
  out = out.split(homedir()).join('~');
  return out;
}

/** Truncate to a head with an honest elision marker. */
function head(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)} [… ${String(text.length - limit)} chars elided]`;
}

/** One content block (string or typed) → markdown lines. */
function renderBlock(block) {
  if (typeof block === 'string') return [redactText(block)];
  if (block === null || typeof block !== 'object') return [];
  if (block.type === 'text' && typeof block.text === 'string') return [redactText(block.text)];
  if (block.type === 'image') return ['`[image elided]`'];
  if (block.type === 'thinking') return []; // internal, never evidence
  if (block.type === 'tool_use') {
    const input = head(JSON.stringify(block.input ?? {}), INPUT_HEAD);
    return [`> ▸ **${String(block.name ?? 'tool')}** \`${redactText(input)}\``];
  }
  if (block.type === 'tool_result') {
    const body = Array.isArray(block.content)
      ? block.content.map((c) => (typeof c?.text === 'string' ? c.text : '[non-text]')).join('\n')
      : typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content ?? '');
    return [`> ▾ result: \`${redactText(head(body.replace(/\s+/g, ' '), RESULT_HEAD))}\``];
  }
  return [];
}

/** Parsed JSONL lines → redacted markdown. */
export function renderTranscript(lines, sessionId) {
  const out = [
    `# Session transcript — ${sessionId}`,
    '',
    '<!-- Exported by scripts/save-transcript.mjs with redaction applied.',
    '     Gitignored; read before sharing anywhere (see _transcripts/README.md). -->',
    '',
  ];
  for (const line of lines) {
    if (line === null || typeof line !== 'object') continue;
    if (line.isSidechain === true) continue; // subagent chatter, not the dialogue
    if (line.type !== 'user' && line.type !== 'assistant') continue;
    const message = line.message;
    if (message === null || typeof message === 'undefined') continue;
    const role = message.role === 'assistant' ? 'Assistant' : 'User';
    const content = message.content;
    const blocks = Array.isArray(content) ? content : [content];
    const rendered = blocks.flatMap((b) => renderBlock(b)).filter((l) => l.trim() !== '');
    if (rendered.length === 0) continue;
    const stamp = typeof line.timestamp === 'string' ? ` · ${line.timestamp}` : '';
    out.push(`## ${role}${stamp}`, '', ...rendered, '');
  }
  return `${out.join('\n')}\n`;
}

/** cwd → the slug ~/.claude/projects uses. */
function slugFor(dir) {
  return dir.replace(/[/.]/g, '-').replace(/\s/g, '-');
}

function main() {
  const args = process.argv.slice(2);
  let slug = slugFor(process.cwd());
  const dirFlag = args.indexOf('--dir');
  if (dirFlag !== -1) {
    slug = args[dirFlag + 1] ?? slug;
    args.splice(dirFlag, 2);
  }
  const store = join(homedir(), '.claude', 'projects', slug);
  if (!existsSync(store)) {
    console.error(`save-transcript: no session store at ${store}`);
    console.error('  (pre-rename sessions live under the old directory slug — try --dir)');
    process.exitCode = 1;
    return;
  }
  const sessions = readdirSync(store)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ id: basename(f, '.jsonl'), path: join(store, f), mtime: statSync(join(store, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  const prefix = args[0];
  if (prefix === undefined) {
    console.log(`save-transcript: ${String(sessions.length)} session(s) in ${slug}`);
    for (const s of sessions.slice(0, 20)) {
      console.log(`  ${s.id.slice(0, 8)}  ${s.mtime.toISOString()}`);
    }
    console.log('run again with an id prefix to export one');
    return;
  }

  const match = sessions.filter((s) => s.id.startsWith(prefix));
  if (match.length !== 1) {
    console.error(
      `save-transcript: id prefix "${prefix}" matches ${String(match.length)} session(s) — need exactly one`,
    );
    process.exitCode = 1;
    return;
  }
  const chosen = match[0];
  const lines = readFileSync(chosen.path, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    });
  const date = chosen.mtime.toISOString().slice(0, 10);
  const outPath = join('_transcripts', `${date}-${chosen.id.slice(0, 8)}.md`);
  writeFileSync(outPath, renderTranscript(lines, chosen.id));
  console.log(`save-transcript: wrote ${outPath} (redaction applied; still read before sharing)`);
}

// Import-safe for the test; runs only as a CLI entry.
if (process.argv[1]?.endsWith('save-transcript.mjs')) main();
