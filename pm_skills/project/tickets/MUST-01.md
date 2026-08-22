# MUST-01 — A Must-use colour can be chosen that the design cannot honour

## Report

Relayed by the owner, 2026-08-22, from a live-app user: "must have
colours not working". No steps, no diagnostics bundle.

## Reproduced (dev build 65d7791, still import, DMC profile, limit 8)

| Step | Result |
| --- | --- |
| Must use DMC 666 (nothing red in the landscape) | Seat taken; 701 stitches with Floyd–Steinberg, 157 with dithering off |
| Must use Anchor 403 on the DMC profile | Chip appears; palette unchanged; one "Note: anchor:403 is set to Must use but is not in this profile's colours…" |
| Switch to Pastels with both seats | Both fall out; the Note names both; palette 8 of 965 |
| Back to DMC | 666 returns; Anchor stays a Note |

## Mechanism

1. **The search offers what the design cannot use.** The Must-use
   add-search is built over the whole universe — every brand, the
   generated maps and custom colours (`browseRows` in `src/main.ts`
   calls `browseRowsFor` with scope `null`) — while the resolver fills
   a seat only from the profile's resolved membership and otherwise
   keeps it with a warning (`resolveProfilePalette` in
   `src/core/palette-resolve.ts`, the `locked-not-permitted` branch).
   The status line promises "*X* will always be in the palette"
   (`addMustUse`) and the Note retracts it a line lower. UI-STANDARDS'
   rule for this panel is to make a contradiction unrepresentable, not
   to validate it after the fact.
2. **A seat is not a presence.** A filled seat guarantees a palette
   entry; stitches still go to the nearest colour, so a thread unlike
   anything in the picture can hold a seat with zero stitches, and the
   Colours-used table (used colours only, `src/core/stats.ts`) will
   not list it. The helper text says seats are "always kept", which a
   user reads as "always used".

Both halves fit the report; which one the user hit is unknown.

## Fix options

- **(a) Scope the search to the resolved membership**, with a reveal
  to search everything that *pins* the chosen colour into the design's
  recipe copy (`include`). Smallest change to semantics.
- **(b) Auto-pin: a Must-use outside membership joins the design's
  recipe copy** as an include pin — the D114 (edited)-copy pattern, so
  the design shows "(edited)" and Update / Save as new apply. The seat
  is then always honourable. Recommended: it keeps the promise the
  status line already makes, and needs no new UI.
- **Presence** is not a Must-use fix at all — it is ICE-RECOLOUR-01's
  swap layer. Until then the helper text should say "kept in the
  palette; stitches still go to the nearest colour".

Either way the `locked-not-permitted` Note stays for loaded files
whose profile moved underneath them.

## Regression surface

`resolveProfilePalette` seats and the `locks-exceed-count` overshoot;
the (edited)-copy flag and Revert; the selection tests in
`tests/palette-selection.test.ts` are policy-world — the profile-world
resolver has no direct tests yet, which this fix should add.

## Acceptance

A Must-use picked from any brand on any profile appears in the palette,
the Colours-used readout and the PDF key; a fresh pick never produces
the Note; Revert drops an auto-pin; save → load → save stays
byte-identical; the seat-versus-presence wording is changed or the gap
is closed.

## Update 2026-08-23 — the owner's file

`project-120x60.json` is the My-threads variant of half 1: six
Anchor/Ariadna seats on a profile whose membership is the inventory of
the browser the design was made in — empty on any other machine, and
empty here. Until a seat's thread is owned it is a Note; own one and it
fills ("1 · limit 8"), the other five stay Notes. The root cause shared
with COUNT-01 — a profile that resolves to nothing renders full-RGB
with the chips still showing — is COUNT-01's to fix; this item keeps
the seat semantics: whether a Must-use outside membership is
auto-pinned (recommended) or the search is scoped. For My threads,
auto-pin means a seat's thread joins the design's recipe copy as an
include pin without being marked as owned — the honest reading of
"must use": the user intends to buy it.

## Shipped 2026-08-23 (D175) — the honesty half

The status line after a pick outside membership now says so instead
of promising a palette place; the Must-use group carries a helper:
"Guaranteed a place in the palette; stitches still go to their nearest
colour, so a seat can go unused." The seat semantics stay the owner's
call (the item is now `[sign-off]`).
