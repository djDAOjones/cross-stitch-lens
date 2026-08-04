# M14-EXT-15 — Size, region & aspect: options for sign-off

Prepared 2026-08-04 (auto-jazz session, D93–D100 landed). Visuals:
[`ext15-mockups.html`](ext15-mockups.html) — open it in a browser
beside this file. The memo's two asks are one decision: every aspect
option changes what the Design size fields *mean*, so where they live
is decided with it (EXT-16 merged here, D92).

## What is being reopened

D52 (M6-CAPRES-01): the capture region is always aspect-locked to the
design through `constrainRect` — the one mutation route — and region
size is provably independent of stitch count (the 4×4 matrix test
over the four scale quantities: design stitches, capture px, preview
CSS px/stitch, export px/stitch). "Lock region" today freezes
position/size; aspect has no control because it has no freedom.

## The options

| | Shape | Stitches stay square? | Region-independence promise | New surface | Cost that matters |
| --- | --- | --- | --- | --- | --- |
| **A — visible lock, on by default** (leading) | "Aspect follows design" toggle on the region; unlocked, free pins re-derive **Design height** from the region's shape | **yes** — height re-derives, nothing distorts | splits: locked = today's invariant; unlocked = region shape *writes* Design height, announced in the readout as it happens | one toggle + the moved size fields | the independence matrix test splits locked/unlocked; unlocked edits ripple into chart dimensions mid-session |
| **B — free pins, resample** (strawman) | region maps onto the fixed grid regardless of shape | **no** — every stitch samples a stretched source | held, but by lying about the pixels | none | distortion in a stitch chart; carried only to make the cost explicit |
| **C — free pins, letterbox** | design keeps its aspect; shortfall pads with empty stitches | yes | held | none, but a third state to explain | empty-cell semantics (D9 fabric threshold) appear without any transparency in the source; charts gain silent blank bands |
| **D — A + shift-drag** | A's lock stays on; a held modifier frees the pin temporarily | yes (A's re-derive) | as A while held | near zero (rides A) | needs the keyboard equivalent stated (shift+arrows already resize — semantics slot in) |

## Size-presentation sub-options (with whichever aspect option wins)

- **S1 — size joins the Capture region section during capture**
  (leading; drawn in the mockups): one "what am I stitching" surface
  while a session runs; the Design section keeps the fields
  otherwise. Moved, never duplicated (the D90 rule). This is the
  reading of the memo's trailed-off sentence the triage recorded.
- **S2 — compact `w × h` row**: a new compound control pattern the
  app does not yet have; solves "chunky" by densifying.
- **S3 — summary-first (D83 depth pattern)**: quietest, but pushes
  size edits to reach 2 — the memo called the fields chunky, not too
  reachable.

## Recommendation

**A + D + S1.** The lock's default-on keeps D52's behaviour for
everyone who never touches it; unlocking answers the memo's "freely
draggable corner pins" without ever distorting a stitch; shift-drag
is the low-surface escape hatch; and the size fields joining the
region section during capture answers the "part of the…" sentence
with the surface the memo was pointing at. B is the honest strawman;
C buys freedom at the price of a third concept (silent blank bands)
that the conflict-explanation culture of this app would then have to
narrate forever.

**Ships with (whatever is signed):** crop-math tests for the chosen
semantics (locked/unlocked split of the independence matrix under A);
the readout naming a derived dimension the moment it derives; ui-spec
§3/§5 amendments; the decision entry recording the losers.

## Sign-off

- [x] Owner signs: **A + D + S1** (2026-08-05, in-session structured
  answer — visible aspect lock on by default, free pins re-derive
  Design height, shift-drag as the temporary exception, size fields
  joining the Capture region section during a session)
- [x] Notes / amendments: none — recommendation accepted as presented.

*(Signed — the shape ships with crop-math tests; this file folds into
the decision entry and is deleted with the ticket on ship.)*
