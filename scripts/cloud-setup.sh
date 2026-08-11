#!/usr/bin/env bash
# cloud-setup.sh — install this repo's dependencies inside a Claude Code
# cloud session (claude.ai/code, the Claude mobile app, `claude --cloud`).
#
# Why: a cloud session starts from a fresh clone on an Anthropic-managed
# VM. Language runtimes are pre-installed; project dependencies are not.
# Without this, the first thing any task must do — `npm run check`, the
# one-command gate that precedes calling anything done — fails on a
# missing `node_modules/`, and the maintainer pays that round trip from
# a phone. Wired to the SessionStart hook in `.claude/settings.json`.
#
# Local sessions exit at the guard below. `CLAUDE_CODE_REMOTE` is `true`
# only inside a cloud VM, so this never installs over a working machine.
#
# Not installed here: `wasm-pack`. Cloud VMs ship rustc and cargo but not
# wasm-pack, so `check:wasm` takes its documented toolchain-aware skip and
# CI stays the backstop for the Rust crate — the same contract as a local
# machine without the toolchain. Installing it would add minutes to every
# cold VM to re-prove what CI already proves on every push.
#
# Always exits 0: a failed install must not stop the session from
# starting. Claude can rerun `npm ci` in-session and read the real error.

set -u

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# A warm VM (resumed session, or a cached environment snapshot) already
# has the tree; reinstalling would add startup latency for nothing.
[ -d node_modules ] && exit 0

echo "cloud-setup: installing dependencies with npm ci"
npm ci || echo "cloud-setup: npm ci failed — run it in-session to see why"

exit 0
