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

## M13 — Visual processing performance, remainder (in progress)

- M13-ACCEPT-01 (2026-08-09) — the machine half passes on
  `v0.5.0+20260809.b4cf665`, every leg valid on the first attempt.
  Node: check 1090, matrix 267, bench 22 on the rebound baselines.
  Browser: capture, mem, trace and backend all VALID — the promise
  measured 37.6 ms at 300² and 29.5 ms at 200², 4.0 updates/sec, zero
  missed callbacks and zero drops, the first run where a miss would
  have failed the command. GC re-confirmed a non-source (0.30 % of
  wall, worst pause 1.8 ms). 66 backend cells EXACT with the indices
  sidecar intact in every one; both fallback probes PASS. The backend
  leg gained a one-command path (`bench:auto -- --backend`). Only
  M13-ACCEPT-02 remains. See D143.

- M13-IMPL-02 (2026-08-09) — the product promise stops being a
  sentence and becomes a gate: `bench:auto` now fails when the driven
  capture leg's sustained rate falls under 4 updates/sec or any frame
  is missed or dropped, with `preview-update` medians bound ×1.35 at
  300²/200². Carries the bv2 bindability amendment — driven *base*
  capture rows may bind, `.edit-<class>` and real-Photoshop rows never
  can, enforced in code. All ten node baselines re-taken on the
  implementation build (1.7–4.3 % faster: uniform drift, not a win);
  env rows gain a parsed browser version. Routing confirmed unchanged
  — no selection code touched. See D142.

- M13-IMPL-01 (2026-08-09) — the two D135-signed candidates ship: one
  reused grab surface per session, and the pump's pre-submit 5.9 MB
  copy replaced by a transfer plus a guarded refill off that surface.
  Measured on a clean bv2 pair (`138cd0f` → `3bfe7ef`, both valid on
  attempt 1): `grab median ms` down in 8 of 8 windows, mean −2.9 ms
  (canonical −16 %/−13 %); `preview-update` flat — the path is not
  grab-bound at the driven cadence, so the saving is headroom, not
  latency. Candidate 2 stays unpriced by construction (the harness
  pump never had the copy). See D138 (code) and D141 (evidence).

- M13-DEF-03 (2026-08-08) — the multi-window bench ledger conserves:
  drop counts fold by delta (`DropLedger`) instead of overwriting a
  cumulative field, per-window totals published separately, and the
  same review caught `rvfc missed callbacks` silently clamping to 0
  after window 1 (D134 published 0 where 119 and 81 were true). D134's
  measured numbers re-checked and unchanged. See D137.

- INFRA-CHECK-01 (2026-08-08) — the starved-desktop all-timeout
  `check` flake reproduced (utility-QoS clamp + load: 10–35×
  inflation, timeout-only failures) and closed: test/hook timeouts
  become 30 s liveness bounds config-wide plus the matrix file's
  explicit floor; suite green at 19–60× starvation, composed `check`
  green quiet. See D136.

- M13-SYNTH-01 (2026-08-08) — synthesis signed at the owner meeting:
  product promise binds to the driven capture leg (rate, not
  interaction p95), the brief's 1024² ≤ 100 ms line retired (1024
  cap stays), backend routing confirmed unchanged, Phase 4 narrowed
  to two bit-exact reuse candidates (IMPL-01) + budget rebinding
  (IMPL-02), IMPL-03 cut as evidence-led restraint. Signed matrix
  and activation block in `docs/performance-evidence.md`. See D135.

- M13-PROF-04 (2026-08-08) — live-path profile complete: the owner
  sitting lands real-Photoshop numbers — promise held (4.1–7.5
  updates/sec), every cost surface-sized not grid-sized (×1.62
  surface → ×1.6–1.76 across grab/dirty/compute), main-thread
  long-task density 11–18 % under a 6.5 MP window (zero on the
  controlled source), adversarial/recovery checks clean. Files
  M13-DEF-03 (harness multi-window drop ledger). See D134.

- M13-PROF-05 (2026-08-08) — memory/GC/contention complete: the
  owner's real-workflow trace confirms GC is not a pause source on
  the app path (max pause 3.92 ms, 0.71 % of wall, major frequency
  identical to the driven leg), allocation-rate mechanism and the
  two crop-sized main-thread copies' #1 reuse ranking confirmed;
  export isolation stood re-proven since D128. See D134.

- M13-MEAS-04 (2026-08-08) — Part C's trace half automated:
  `bench:trace` drives the flagged bench Chrome over raw CDP (Node
  built-in WebSocket, zero new deps), publishes validated per-window
  GC buckets with observer long tasks quoted alongside, and the
  first canonical quiet-gap artefact closes PROF-05's live-GC line —
  GC is not a pause source under driven capture (~0.4 % of wall
  time, max 12.5 ms, zero long tasks). See D132/D133.

- M13-MEAS-03 (2026-08-08) — the owner session shrinks to its human
  legs: `bench:auto` runs the capture and mem legs unattended
  (flag-granted, content-guarded, validity-gated), `--when-quiet`
  arms quiet-gap runs, the forced-GC probe answers D71 in mechanism
  (lazy major GC, not retention), and the zero-click Part-A′
  cross-check holds (0.98–1.01×) so automated capture rows are
  canon. See D129/D130/D131.

## M15 — Colour & dithering profiles (agent work complete — the two acceptance sessions remain)

- M15-GALLERY-01 batch 2 (2026-08-09) — eight more built-in style
  profiles ship owner-signed, taking the gallery to sixteen: four
  rule-shaped (Rainforest, Spring meadow, Gemstones, Moorland) and
  four curated (Art deco, Mid-century modern, Fair Isle, Fluoro spot
  print), chosen against the gaps batch 1 left — no greens, nothing
  narrowing on chroma rather than hue, nothing muted. Batch 1's
  numbers could not be regenerated, so the evidence run was rebuilt
  from the published sheet and committed as an `AUDIT=1` audit; the
  ticket's own "Risograph print" turned out to be a trademark and
  ships renamed, with `riso` added to the naming guard. See D144
  (drafting) and D146 (signature).

- M15-GALLERY-01 batch 1 (2026-08-09) — eight built-in style profiles
  ship owner-signed: five rule-shaped (Autumn leaves, Golden hour,
  Winter frost, Deep sea, Neon noir) and three curated (De Stijl
  primaries, Delft blue, Ukiyo-e woodblock). The batch set the
  evidence format — each candidate rendered through the real pipeline
  and reported by the colours it actually selects — which caught two
  candidates not reading as their names before signature. Later
  batches continue against the ticket's remaining candidates. See
  D139 (drafting and review) and D140 (signature).

- M15-DITH-01, M15-DITH-02, M15-DITH-03, M15-DITH-04 (2026-08-07) —
  the dither half ships on the shared shell with zero shell changes:
  presets + structural matching move to core, ditherProfileRef joins
  v5 additively, the dither kind mounts in the takeover editor with
  basis lines and the demo-palette context, and Processing recuts to
  a profile select with the never-lying Custom state and the
  full-RGB sentence. See decision-log D125.

- M15-PERSIST-01, M15-UI-02, M15-UI-03, M15-UI-04, M15-UI-01,
  M15-ACCEPT-01 (2026-08-07) — the colour half ships whole: the
  kind-aware profile store + generic file format + My colours; the
  kind-agnostic takeover editor (shell, colour form, judgement
  preview) behind, then replacing, its dev entry; schema v5 with
  best-effort migration under the D114 waiver; the Colour section
  recut to profile select + (edited) verbs + count/distance +
  Must-use chips; honest non-thread export keys. See decision-log
  D123/D124.

- M15-CORE-01, M15-CORE-02, M15-CORE-03 (2026-08-07) — the colour
  core lands: six generated colour maps under the `map:`/`user:`
  namespaces with exact-match CSS naming and honest labels; the
  profile recipe + five-step resolver with a sentence per narrowing
  and nine non-empty built-ins (Classic cross stitch ships real);
  selection gains the minimum-distance rule with guaranteed Must-use
  seats and the prefer machinery removed. See decision-log D122.

- M15-SCOPE-02 (2026-08-07) — the dither half signs: a dithering
  profile is a complete named `DitherConfig`; the seven presets
  become read-only built-in profiles (duplicate-to-edit, basis
  lines kept); the dither kind mounts in the shared takeover shell
  and preview rig with a named demo palette under full-RGB;
  Processing recuts to profile select + Edit profiles; persistence
  is snapshot + additive `ditherProfileRef`. Colour builds first,
  dither second (owner order). M8-ACCEPT-01 absorbed into
  M15-DITH-05. Build broken into M15-DITH-01..05. See decision-log
  D116.

- M15-SCOPE-01 (2026-08-07) — the joint scoping session signs the
  colour-profile scope: profile = composition recipe (libraries,
  owned modifier, per-colour pins, H/S/B ranges) resolving to the
  available colour table; takeover-view editor with draft-then-Save;
  exclude dissolves into membership, Must use stays per-design,
  Prefer retires; ranges in profile, minimum distance beside count;
  the (edited)-copy pattern links designs to named profiles; presets
  retire into read-only built-in profiles. Build broken into
  M15-CORE-01..03, M15-PERSIST-01, M15-UI-01..04, M15-ACCEPT-01/02.
  See decision-log D114.

## M14 — UI/UX excellence (complete — owner accepted 2026-08-07)

- M14-ACCEPT-01 (2026-08-07) — the maintainer end review passes over
  the six looks' review pack and evidence; no failures routed. The
  milestone closes: acceptance passed, `check` green on final code.
  See decision-log D127.

- M14-EXT-38, M14-EXT-39, M14-EXT-40, M14-EXT-41, M14-EXT-42,
  M14-EXT-43, M14-EXT-44 (2026-08-07) — the sixth look lands in one
  auto-jazz run: the capture row trims to Stop · Freeze · locks
  (Capture frame cut, pump death recovers via Unfreeze); the status
  region moves into the header under the build id with an economy
  pass; the snapping Threads dropdown is fixed by a structural
  no-rebuild contract (fingerprint-gated updates, pinned by test);
  Design dissolves into a standing Capture section with the Zoom
  rename and a Stats stitch-size row; the Colour section compresses
  (count cluster, availability-only summary, provenance marks);
  Processing order and the Advanced section retire (loaded
  reduce-first files honoured and named); "Colours used" becomes a
  real section and the settings aside flattens to one hierarchy. See
  decision-log D121.
- M14-EXT-31..37 (2026-08-07) — the fifth look lands in one auto-jazz
  run: the preview becomes a real accordion section (bar toggle
  retired, disclosure persisted, collapsed heading unpinned); the
  settings toggle and whole-panel collapse retire (shell model =
  cold alone); the Capture section renames, opens every session, and
  takes the session controls back inline (Source reads "Source"
  always — D108's fixed point consciously surrendered); Size keeps
  one permanent home in Design (S1 retired); Grid options becomes a
  live-apply form modal (Numbers folded in, tick font size surfaced);
  the EXT-36 polish pass fixes the focus-obscuration reserve and
  parks three named residues; the EXT-37 Carbon table closes with
  zero unexplained deviations (one new chevron waiver). See
  decision-log D110.
- M14-EXT-25 (2026-08-06) — owner picked option A at the sign-off
  gate: the Source button carries the session ("Capturing — Source";
  Stop/Pause/Capture frame lead its modal, primary Stop), the inline
  row reduces to Lock region beside Lock aspect, nothing cut. See
  decision-log D108.
- M14-EXT-19, M14-EXT-20, M14-EXT-21, M14-EXT-22, M14-EXT-23,
  M14-EXT-24, M14-EXT-26, M14-EXT-27, M14-EXT-28, M14-EXT-29,
  M14-EXT-30 (2026-08-06) — the fourth look lands in one auto-jazz
  run: entire-screen picker hint; "Lock aspect" default-off with
  both dimensions deriving through a visible Stitch size scale and a
  compact Size row; a Stats section takes every headline figure while
  the region readout and all fold summaries retire (bare headings
  app-wide); the preview collapses like any region and preview focus
  retires whole; a Debug menu gathers copy/download/email; engaged
  trackpad pinch and pan; Colour stands alone with the
  Threadify/constrain recut; Appearance becomes Processing with the
  grid geometry under the view strip. EXT-25 survives as the one
  owner pick. See decision-log D107.
- M14-FIX-05, M14-FIX-04, M14-FIX-02 (2026-08-05) — stats line loses
  its duplicated dimensions and the block tightens to 128 px; a
  debounced zero-chrome window-width guide in the status region; the
  app's own tab excluded from its capture picker with honest
  window-share copy. See decision-log D105.
- M14-FIX-01 (2026-08-05) — capture region mounts above the preview
  during a session; focus hands to it, collapse/lock return the lead.
  One signed exception to preview-first order. See decision-log D104.
- M14-FIX-06+03 (2026-08-05) — the scroll-linked dock deleted (its
  height change fed back through scroll anchoring as the owner's
  docked↔undocked flap); the canvas now hugs the fitted design under
  auto-fit with posture caps — scroll-neutral by construction. See
  decision-log D103.
- M14-EXT-15 (2026-08-05) — owner signed A + D + S1 and the shape
  shipped: aspect-follows toggle (default on, session-only), free
  pins derive design height, shift-drag exception, size fields join
  the capture section per session; crop suite gains the
  locked/unlocked split. AGENTS.md invariant updated. See
  decision-log D101.
- M14-EXT-17 (2026-08-04) — thread highlight as a Compare-class
  preview decoration over the index sidecar: per-row toggles, scrim
  over non-matching stitches, export bytes re-proven identical,
  +0.8 ms/frame at 300². See decision-log D100.
- M14-EXT-14 (2026-08-04) — colours table collapsed by default, the
  fold line carrying count + leading thread; persisted choice wins.
  See decision-log D99.
- M14-EXT-13 (2026-08-04) — colour limit as "Limit colours" switch +
  slider (1–64, number to 512); exact demoted to depth; fresh default
  now at-most-8, announced on three surfaces (supersedes D55's
  unlimited). See decision-log D98.
- M14-EXT-12 (2026-08-04) — capture surface moved into a first-position
  "Capture region" accordion section, open first appearance, persisted
  collapse; source section is the cold entry only. See decision-log
  D97.
- M14-EXT-18 (2026-08-04) — viewport composition verified whole:
  188-control walks at 320/800/1280 with zero focus obscuration, the
  memo's palette scenario proven at 320, zero duplicate affordances,
  both schemes. See decision-log D96.
- M14-EXT-08..11 (2026-08-04) — the viewport arc as one set: auto-fit
  until touched with Reset view as the only fit control (D86 waiver
  closed), sticky/docked preview in both layouts, pan engagement =
  host focus (wheel-zoom deleted), permanent quiet view strip with
  the grid toggles moved in. Composition verify is EXT-18. See
  decision-log D95.
- M14-EXT-07 (2026-08-04) — entry sample removed on the memo's ask;
  the Source modal keeps the one zero-permission demo route (sample
  now reach 2, modal only). See decision-log D94.
- M14-EXT-06 (2026-08-04) — cold surface as a shell state: entry-only
  page before any source, `cold` in the one shell model overriding
  both preferences, five exit routes + quiet "Open a project", focus
  handed to the Source button on exit. See decision-log D93.
- M14-EXT-05 (2026-07-23) — polish pass from the owner's second
  look: nine findings (cold-surface duplication, view-controls double
  chrome, ragged wrapping, raw Load input, always-on colours table),
  nine fixes, one recorded lesson — verify composition, not just each
  new affordance alone. See D90.
- M14-EXT-01..04 (2026-07-23) — owner-feedback extension shipped as
  one set: app bar (title, build id, Source, shell modes, dev
  diagnostics + Download log), Source choice modal with cold-start
  entry preserved, persisted View-controls fold (supersedes the D86
  A16 waiver), Design width/height rename. See D88 (triage) + D89
  (ship); evidence in `docs/ui-evidence.md`.

- M14-VERIFY-02 (2026-07-23) — journeys re-walked on final code (1
  interaction to converted preview; both conflict severities followed
  out; reach contract measured within bounds); byte-identity attested
  (3 PNGs sha-identical; PDF content streams identical incl. the
  17.7 MB raster; project field-wise clean); bench green; engine dirs
  diff-clean across the milestone. See D87.
- M14-VERIFY-01 (2026-07-23) — conformance re-proven on final code:
  19/22 findings closed with evidence, 3 waived on record (Fit menu
  taste call, FIT_MARGIN, staleness bound); zero dangling ARIA refs;
  zero sub-44 targets over 176 focusables; gate items answered. See
  D86; ledger in `docs/ui-evidence.md`.
- M14-IMPL-05 (2026-07-23) — D79 map applied end-to-end with derived
  strings following ("Unlimited colours" everywhere one concept
  surfaces); one core conflict sentence deferred to ACCEPT-01 on
  record; before/after inventory in the evidence doc. See D85.
- M14-IMPL-04 (2026-07-23) — first-run layer: entry state with three
  visible actions + capture expectations, drawn deterministic sample
  through the real pipeline, source-row compaction, crop status with
  position at end-events (A8), allow-list capture labels (A7),
  filtered-out thread state; no tour, on record. See D84.
- M14-IMPL-03 (2026-07-23) — the five-section architecture is live:
  default page 14,495 → 3,877 px, settings tab stops ~130 → 11,
  every reach inside the D76 contract; disclosure state persisted in
  preferences; summaries derived from owned state. See D83.
- M14-IMPL-02 (2026-07-23) — full Carbon anatomy in place: linked
  helpers + announced snap-back corrections, drawn 44 px checkboxes
  with per-thread names, project-coded Carbon modals replacing
  prompt/confirm, local disabled reasons, operable canvas/crop roles,
  hex in info rows. Live-verified; pure halves node-tested. See D82.
- M14-IMPL-01 (2026-07-23) — dev shell shed: styling moved to
  tokens/base/shell sheets under `src/ui/styles`, index.html down to
  an 8-line critical block; Carbon productive ramp + layer panel
  live; all shell invariants held (matrix in `docs/ui-evidence.md`);
  engine surfaces diff-clean. See D81.
- M14-SPEC-02 (2026-07-23) — tokens.css landed (two systems, both
  schemes, unconsumed — zero visual change proven) with the
  `check:contrast` gate step: 17 @pair rows × 2 schemes all ≥ AAA
  bars; AAA adaptations from Carbon recorded. See D80; pair table in
  `docs/ui-spec.md` §9.
- M14-SPEC-01 (2026-07-23) — interaction architecture decided: 3-tier
  reach contract, 7 groups → 5 stateful accordion sections with derived
  summaries, thread depth behind one lazy disclosure, first-run entry
  state + generated sample, terminology map. Every audit major answered
  or deferred with a reason. See D76–D79; spec in `docs/ui-spec.md`.

- M14-AUDIT-02 (2026-07-23) — five journeys walked from a cleared
  origin with step counts and a full control-tier inventory: 1-drop
  conversion is strong; Dither/Export/Project buried at 10–12k px
  (~130 tab stops); no autosave — silent loss on close confirmed. See
  decision-log D75; record in `docs/ui-journeys.md`.
- M14-AUDIT-01 (2026-07-23) — standards & heuristics audit: 22 ranked
  findings (8 major, no blockers) across every surface × state;
  byte-identity tripwire landed (`tests/ui-baseline/` — fixture,
  Node-pinned hashes in `check`, browser export captures welded to the
  reference pin). See decision-log D74; findings in `docs/ui-audit.md`.

## Archived: M13 phases 1–2 (2026-07-22 → 2026-07-23; remainder open) — see archive/trajectory/trajectory-0003-2026-07-22-to-2026-07-23.md

## Archived: M6–M8 (2026-07-21 → 2026-07-22) — see archive/trajectory/trajectory-0002-2026-07-21-to-2026-07-22.md

## Archived: M0–M5 (2026-07-17 → 2026-07-20) — see archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md
