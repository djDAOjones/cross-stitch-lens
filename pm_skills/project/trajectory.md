# Trajectory

<!-- Shipped-work narrative. The story of what changed over time, in chunks. -->
<!-- Warm tier. Agents do NOT auto-read this every task. Read it on demand:
     during memory-maintenance.md (Refactor), release.md, or when
     reconstructing what already shipped. See AGENTS.md → "Before every task". -->
<!-- Compress on ship. One line per item: the outcome, not the implementation.
     The WHY lives in decision-log.md; the per-file roles live in file-map.md.
     Never paste a decision-log entry in here. A pointer is enough. -->
<!-- Keep every shipped ID individually greppable: start each line with the
     item ID. When one line covers a group of related sub-items, spell out
     each ID (e.g. WL-19a, WL-19b, ... WL-19h) rather than a range, so an
     ID-level reconcile can find them all. -->
<!-- Structure: newest phase/milestone at the top. Group items by the phase or
     milestone they belong to, with a one-line Outcome per phase. -->
<!-- Budget: see pm_skills/memory-policy.md. Over budget → memory-maintenance.md
     (Prune) moves the oldest phases to archive/trajectory/trajectory-NNNN-<range>.md
     and adds a row to archive/INDEX.md. Archives are append-only; never rewrite. -->

## M0 — Scaffold & quality gate (shipped 2026-07-17, v0.1.0)

- M0 — Vite 8 + TS 6 strict + ESLint 10 (core-isolation rule) + Vitest 4;
  `check` = typecheck + lint + test + build + docs baseline + secret scan;
  CI runs `check`; core types (`PixelBuffer`, `Palette`, `Stage`,
  `ProjectFile` v1 stub) + minimal pipeline executor; golden harness with
  per-test tolerance + hello-world identity test (4 tests); app shell with
  build identity + structured logger. See decision-log 2026-07-17 (D12).

Outcome: `npm run check` green end-to-end; dev server boots and renders
the shell with version identity.
