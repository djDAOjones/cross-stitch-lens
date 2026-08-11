# Session transcripts

Saved chat-session transcripts, kept as evidence for later evaluation
and prompt-tuning. **Cold tier — never auto-loaded** (`AGENTS.md` →
"Before every task"); the close ritual in
`pm_skills/prompts/end-of-task.md` offers to save one, and it never
gates a close.

Saving is one command since DOCS-01 (D159):

```sh
npm run transcript
```

lists this project's Claude Code sessions; run it again with an id
prefix to export one here as **redacted** markdown. Sessions from
before the D150 rename live under the old directory slug — reach them
with `--dir`.

The `.md` files here are **gitignored**, deliberately. A transcript
carries whatever was on screen during a working session — captured
content, file paths, project names — so it stays local unless it has
been read and redacted first. See `pm_skills/GUIDE.md` → "Saving
session transcripts" for the redaction rules.

This README is the one tracked file in the folder; it exists so the
path is real, so documentation may reference it, and so the ignore
rule has something to sit beside.
