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

<!--
Example phase (delete when you add your first real one):

## Phase 1 — Text-only skeleton (shipped 2026-04-20)

- A1-1 — Hub control plane + event-log projections. See decision-log 2026-04-12.
- A1-2 — Audience submit (anonymous, cooldown). See decision-log 2026-04-14.
- A1-3 — Moderator console v0 (four-pane shell). See decision-log 2026-04-15.

Outcome: an end-to-end text path runs locally; submit → moderate → display.
-->
