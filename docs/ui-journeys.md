# UI journeys & control-depth map — M14-AUDIT-02

The two inputs M14-SPEC-01 designs from: what a first-time user meets
(five journeys, walked as-is, no charity), and the complete control
inventory with audience tiers and findability. **Read-only**: pointers,
not solutions. Companion to `docs/ui-audit.md` (finding numbers `A#`
refer to its table).

- **Build**: v0.5.0 · `v0.5.0+20260723.9758da2` (2026-07-23), dev
  server, in-session browser (Chromium 148), 1280 × 800 unless stated.
- **Method**: storage cleared (localStorage + IndexedDB) and the app
  reloaded before the first walk, so first-run state is genuine.
  Journey 2 cannot script the OS share picker: the walk substitutes a
  `canvas.captureStream` source at the `getDisplayMedia` boundary and
  says so where it matters; the real route adds the browser prompt and
  a surface choice (~2 user decisions).
- **Interaction counting**: one step = one click/keypress/drop with a
  purpose; OS dialog choices counted and named; scrolling is recorded
  as depth (px from page top), not steps.

## Journey 1 — cold start → still image → converted preview

| # | Step | What the user sees / must know |
| --- | --- | --- |
| 1 | Read the empty state | "No image yet — the preview appears here after import." names what will happen; the hint names all three routes (file, drag-drop, paste) |
| 2 | Drop an image anywhere (or: click Choose file → OS picker → pick = 3 steps) | Nothing marks the drop target — the hint sentence is the only affordance |
| 3 | Wait ~1.3 s | "Processing…" → "Preview updated."; preview, toolbar, stats and export buttons all appear at once |

**Steps to converted preview: 1 (drop) / 3 (picker).** Measured
1,316 ms from drop to "Preview updated." at 256² source → 200².

- **Understood?** Dimensions ("200 × 200 stitches"), zoom ("216%") and
  the stats line ("40,000 stitches · 195 colours") are immediately
  visible. What is *not* explained: that this is a *thread-mapped*
  rendering (DMC is silently the default palette), what the grid means,
  or what to do next — the right rail starts with grid-line cosmetics,
  not the next decision (colours/size/export).
- **Jargon met**: none blocking on this path — labels here are user
  language (a strength; `SCALE_LABELS` enforces it).
- **Keyboard variant**: 3 tabs reach the file input (header buttons
  first), Enter opens the picker. Clean.
- **Status gaps**: none — every transition announced.
- **Strengths (do not regress)**: three import routes; status honesty;
  everything appears in one beat; exports enable exactly when real.

## Journey 2 — cold start → live capture → crop → edit loop

| # | Step | Notes |
| --- | --- | --- |
| 1 | Click "Start screen capture" (visible above the fold, y≈411) | No pre-prompt guidance: the OS picker appears with no explanation of what to share or what happens next (gap for IMPL-04); transient status "Requesting screen capture…" |
| 2–3 | Browser picker: choose surface, click Share *(real route; synthetic in this walk)* | Declining is handled honestly ("Screen capture was declined — nothing was shared. Start capture again to retry.") |
| 4 | Session appears | Thumbnail + pre-drawn aspect-locked region (largest fit, centred) + readout "Capture region 600 × 600 px → 200 × 200 stitches" + four session buttons; first frame processes without further action |
| 5+ | Edit in the source app | Preview updates continuously ("Preview updated."; stats track the scene — observed 195 → 75 colours on scene change). Pause / Lock / Stop each one click, each announced |

**Steps to a live converted preview: 3 (1 in-app + ~2 picker).**

- **Friction**: the crop *concept* is unexplained — handles are
  pointer-affordances only; the keyboard route (arrows / shift+arrows)
  exists but is discoverable only via the accessibility label; moves
  give no text feedback (A8). The capture label can leak a machine
  token (A7). No guidance that the region can be redrawn by dragging
  empty space.
- **Keyboard variant**: overlay is focusable (tab), arrows move,
  shift+arrows resize — works, silently (A8).
- **Strengths**: sensible default region (nothing to draw before first
  output); pause/lock/stop all visible, labelled, announced; external
  stop (browser UI) handled with an honest message.

## Journey 3 — palette refinement

Walked: restrict brands → set a colour count → lock a thread →
exclude a thread → meet conflict sentences.

| Goal | Steps from the Colour group | Observed |
| --- | --- | --- |
| Only Anchor threads | 2 clicks (untick DMC, tick Anchor) | Summary re-counts live: "446 permitted · 446 in palette" |
| At most 20 colours | 2 controls (mode select, number) | "20 selected of 20 requested · 20 used in the design" — honest; preview re-renders |
| Lock Anchor 403 | 2 (search "anchor 403", row select → Lock) | Search narrows instantly; row select carries a per-thread name |
| Exclude it instead | 1 (row select → Exclude) | Rules stay disjoint by construction; no contradiction reachable by click |
| Conflict sentences | — | Every degenerate state met is a full sentence naming the way out, in a polite live region (see audit matrix) |

**But the group must first be found**: the Colour legend sits at
y≈1,115 on the populated default page; the count control at y≈2,024.
And the group's own internals are the depth problem — the 60-row
thread list (each row a checkbox + select) sits between the count
controls and everything after the Colour group.

- **Jargon met**: "Palette source", "Strict — use only these threads"
  (clear); "mapped colours / measured colours" (explained only in a
  hover note); "eligible"/"permitted" (summary language, learnable);
  "revision" on saved palettes (implementation term).
- **Keyboard variant**: reaching past the thread list costs ~130 tab
  stops (60 rows × 2 controls + group furniture) — the keyboard user's
  version of the depth finding.
- **Strengths**: count summary honesty (selected vs used); search;
  bulk buttons that state their count and disable at zero; undo-based
  palette deletion.

## Journey 4 — export chart PNG and PDF; find the four resolutions

| # | Step | Notes |
| --- | --- | --- |
| 1 | Scroll to Export (y≈10,671 of 11,760 — 13 screens) | Nothing on the preview surface points to Export |
| 2 | Export chart PNG: 1 click (chart cell adjacent, default 10) | "Exporting…" → "Exported chart-200x200.png." |
| 3 | Export PDF: 1 click (page size / orientation / margin / title adjacent, defaults sane) | "Exported chart-200x200.pdf." |

**The four resolutions live on three surfaces at three depths**:
pattern (right rail top, y≈276 — visible), capture (source section,
live only), preview scale (toolbar zoom label + buttons), and export
scale with chart cell (y≈10,671). A user asking "how big will it be?"
has no
single place to look (SPEC-01 input; the model itself — unit-named,
independent — is a strength to keep).

- **Export vs draft**: exports always re-run at full quality; the only
  copy saying so is the draft badge's own line ("Draft quality —
  dithering off while the pipeline catches up."), which a user only
  sees under load. Nothing near the Export buttons states the
  guarantee.
- **Flat-list grouping** within Export: ten controls, three exporters
  interleaved (A22).
- **Strengths**: buttons disabled until real; clamped values explained
  ("scale limited to N"); every export announced with its filename.

## Journey 5 — save → close → reopen → same output

| # | Step | Notes |
| --- | --- | --- |
| 1 | Save project (y≈11,558 + 1 click; browser saves the file) | "Saved project-200x200.json." |
| 2 | Close / reload | **Everything is silently gone** — no autosave exists anywhere in the code (the architecture stack line is aspiration); no warning of unsaved work; first-run empty state returns |
| 3 | Load project (click + picker = 2) | Into an empty session: "Loaded project-200x200.json — import an image to see it applied." — honest about the file not carrying pixels |
| 4 | Re-import the same artwork (1 drop) | Identical output reproduced (195 colours; byte-proof is the ui-baseline tripwire) |

- **The dead end**: between "close" and "reopen", a novice who never
  found Save (13+ screens deep) loses the session with no warning.
  There is no autosave to "understand" — the honest M14-scope fix is
  placement + copy (make Save findable; say that work is not kept),
  not building autosave (new behaviour, out of milestone scope —
  SPEC-01 to place, backlog to own the feature).
- **Strengths**: the loaded-project drift/honesty machinery (snapshot
  wins; missing-thread sentences); round-trip fidelity.

## Worst obstacles, ranked

**Novice:**

1. Nothing after the first preview says *what next* — the rail leads
   with grid cosmetics; export and save are 13–14 screens deep
   (J1/J4/J5; A4).
2. Silent total loss on close — Save never found + no warning (J5).
3. Capture starts with an unexplained OS prompt and an unexplained
   crop model (J2).
4. The default palette (DMC, all 489) is silent — the first preview is
   thread-mapped without the user ever choosing threads (J1).

**Depth user:**

1. The thread list inflates the panel ~8,000 px, burying Dither /
   Pipeline / Export / Project at 10–12k px (~130 tab stops) (J3/A4).
2. The four resolutions span three surfaces at three depths (J4).
3. Split compare, fit modes and preview scale are toolbar-only prose
   buttons — efficient once known, invisible as a *system* (no grouping
   or shortcuts listed anywhere).

## Control-depth inventory

Tier: **E** essential (novice's first session) · **C** common
(returning user) · **D** deep (designer/power) · **dev** (dev-only) —
first-pass judgements; SPEC-01 decides. Findability: **vis** (visible
on default surface) · **scroll** (visible after scrolling; depth
noted) · **mode** (visible only in a mode/state) · **dev** (dev
builds). Interactions = clicks/keys from the default populated surface
to *use* the control (scroll not counted).

| Surface | Control | Does | Tier | Findability | Int. |
| --- | --- | --- | --- | --- | --- |
| Header | Hide/Show settings | collapses the panel; persisted | C | vis | 1 |
| Header | Preview focus / exit | preview-only mode; Escape exits too | C | vis | 1 |
| Source | Source image (file) | import via picker | E | vis | 2 |
| Source | drag-drop / paste routes | import alternatives | E | invisible (hint prose only) | 1 |
| Source | Start screen capture | begins a session (OS prompt) | E | vis | 1–3 |
| Source (live) | Capture frame | one-shot grab | C | mode | 1 |
| Source (live) | Pause/Resume capture | pump on/off, announced | C | mode | 1 |
| Source (live) | Lock region | freezes crop; hides handles | C | mode | 1 |
| Source (live) | Stop capture | ends session | E | mode | 1 |
| Source (live) | Crop overlay (drag/handles/arrows) | which pixels feed the grid | E | mode | 1+ |
| Toolbar | Zoom in / out | preview scale step | E | vis (populated) | 1 |
| Toolbar | Fit / Fit width / Fit height | fit modes (Fit = reset) | C | vis | 1 |
| Toolbar | Compare + Split slider | source-vs-output divider | C | vis (slider mode-gated) | 1–2 |
| Toolbar | zoom % + dimensions readouts | preview scale · pattern size | E | vis | 0 |
| Pattern | Pattern width / height | stitch grid (the design's size) | E | vis top of rail (y≈276) | 2–3 each |
| Grid | Show grid / Row-and-column numbers | overlay toggles | C | scroll y≈547 | 1 |
| Grid | Minor/Major interval, thicknesses | overlay density/weight | D | scroll y≈693+ | 2–3 |
| Grid | Line colour | overlay colour (native picker) | D | scroll | 2+ |
| Colour | Colour mode (threads / full RGB) | palette on/off | E | scroll y≈1,115 | 2 |
| Colour | 8 brand checkboxes (+provenance notes) | permitted brands | C | scroll y≈1,228 | 1 each |
| Colour | Palette source (brands/preset/saved) | where candidates come from | C | scroll | 2 |
| Colour | Preset mode (strict/prefer) | preset application | D | mode (preset only) | 2 |
| Colour | Only threads I own | inventory restriction | C | scroll | 1 |
| Colour | Colour count mode + N | all / at-most / exactly | C | scroll y≈2,024 | 2–3 |
| Colour | Find a thread (search) | narrows the 60-row list | C | scroll y≈2,165 | 2+ |
| Colour | Per-row: Own checkbox | inventory mark (×60 rendered) | D | scroll | 1 each |
| Colour | Per-row: rule select (lock/prefer/exclude) | per-thread rule (×60) | D | scroll | 2 each |
| Colour | Bulk own / disown (counted labels) | whole-filter inventory ops | D | scroll | 1 (+confirm) |
| Colour | Palette contents (disclosure + editor) | saved-palette reorder/remove | D | mode (library source; empty otherwise — A5) | 2+ |
| Colour | Save as palette / Delete / Undo delete | library palette lifecycle | D | scroll | 1–2 (+prompt A6) |
| Colour | Export/Import inventory · Export palettes | JSON in/out of the library | D | scroll | 1–2 |
| Dither | Preset (7 + Custom) | evidence-named bundles | C | scroll y≈10,125 | 2 |
| Dither | Algorithm (5 + none) | method choice | D | scroll | 2 |
| Dither | Strength / Serpentine | per-family tuning | D | scroll | 2–3 |
| Pipeline | Order preset (resize/reduce first) | stage order (§7) | D | scroll y≈10,400 | 2 |
| Export | Export scale (+helper) | clean-PNG px/stitch | C | scroll y≈10,671 | 2–3 |
| Export | Background + colour | transparent/solid flatten | C | scroll | 2+ |
| Export | Export PNG | clean/enlarged PNG | E | scroll | 1 |
| Export | Chart cell size | chart px/stitch | C | scroll | 2–3 |
| Export | Export chart PNG | styled chart | E | scroll | 1 |
| Export | Page size / Orientation / Margin / Title | PDF options | C/D | scroll | 2–3 each |
| Export | Export PDF | single-page chart PDF | E | scroll | 1 |
| Project | Save project | settings+palette snapshot to JSON | E | scroll y≈11,558 | 1 |
| Project | Load project | apply a saved file | E | scroll | 2 |
| Info | stats summary + colours-by-usage table | what the design is made of | E (read) | scroll (below preview) | 0 |
| Status | prose status line (aria-live) | every action's outcome | E (read) | vis | 0 |
| Focus mode | compact status line | the only status in focus | C (read) | mode | 0 |
| Dev | Profiling disclosure (timings table) | per-stage ms | dev | dev | 1 |
| Dev | Copy diagnostics (+announced result) | redacted bundle to clipboard | dev | dev | 1 |

**Checklist note for VERIFY-02**: re-measure the depth column (y-px
and the ~130-tab figure) and the per-journey step counts on the
finished UI; the counts above are the "before" numbers.
