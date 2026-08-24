# TWOCOLOUR-01 — a two-colour mode whose two colours you choose

Raised by the owner 2026-08-24: *"users can select a 1-bit colour mode
and easily specify the two colours."* This file records what the app
does today, why that is not yet satisfactory, and the options — the
shape is the owner's call, not settled here.

## What is possible today

**It can be done, but only by construction, and nothing in the app
names it.** The route:

1. Colour section → open the profile editor → **New**.
2. "Find or add a colour": type a hex. A colour the catalogue cannot
   answer offers *"Add #xxxxxx as a custom colour"*, which stores it in
   the global My-colours library and pins it (`user:` id, D115).
3. Repeat for the second colour.
4. Name, save, select the profile.
5. Optionally set **Constrain number of colours** to 2 — though a
   two-entry profile is already two colours.

Seven steps through a general-purpose editor, and every one of them
has to be worked out rather than followed.

## Why it is not satisfactory

**1. There is no two-colour concept in the product.** `grep -riE
"1.bit|one.bit|two.colour|bi.level"` over `src/ui/` and `src/main.ts`
returns nothing. The capability exists; the idea does not.

**2. The name that does exist is a trap.** `1-bit RGB` is a shipped
colour map — and it is **eight** colours, because it is one bit *per
channel*. A user hunting for "1-bit" finds it, gets eight, and has
been actively misdirected rather than merely unserved. This is the
strongest argument that the gap is worth closing: the app currently
answers the question wrongly.

**3. `Black & white` is a dead end for customisation.** It is the
obvious starting point and it is exactly two colours — but its
membership is generated (`libraries: ['map:bw']`), so the two values
cannot be edited. Built-ins are read-only and Duplicate makes an
editable copy (D114), but the copy still points at the map: changing
the two colours means knowing to *uncheck the library and pin two
colours instead*. Nothing says so.

**4. The partner feature is already built and unlinked.** Tone mode
(TONE-01) plus two colours plus dither is classic 1-bit halftone —
arguably the single most recognisable thing this app could do. Nothing
leads a user from one to the other.

**5. Minor, and real:** the count number input is `min="1"`
(`ui/colour-section.ts`) while its own helper says *"The slider runs
from 2 to 512"*. One colour is reachable by typing and not by
dragging. Either one is a legitimate design (a single-colour
silhouette) and the helper is wrong, or it is not and the input should
floor at 2.

## Options for the shape — the owner picks

Not ranked; each is a different amount of product.

- **A. A built-in you duplicate.** Ship a `Two colours` built-in that
  is two *pinned* entries rather than a map, so Duplicate-to-edit
  lands the user on exactly the right recipe with two swatches to
  change. Cheapest — one entry in `builtInProfiles()`, no new UI, no
  schema change. Fixes (2) and (3), leaves the flow long.
- **B. A profile kind.** A fourth kind in the editor's kind map
  alongside colour/dither/adjust — "two colours", rendering just two
  swatch pickers. The takeover editor is already a kind map in
  `main.ts`, so a fourth kind costs one branch (D202). Fixes (1)–(3);
  more surface.
- **C. A Colour-section shortcut.** A control in the Colour section
  itself — "Two colours" with two pickers — that writes a profile
  behind the scenes. Most discoverable, most product, and the one that
  needs the hardest thinking about what it does to the profile model
  (a design linked to a profile it did not choose).

Independently of A/B/C: **rename or re-label `1-bit RGB`**, which is
the misdirection. It is a shipped map id (`rgb1`) so the id must
stand; only the display name is in play, and any rename is a
gallery-facing change and therefore owner-signed.

## Done when

A user can reach a two-colour design with two colours of their
choosing without having to work out that a profile is the mechanism,
and `1-bit RGB` no longer answers the question wrongly. Evidence: the
flow walked end to end in the real app, plus a rendered example at two
colours with dither on.

## Links

- Current mechanics: `src/ui/profile-editor-colour.ts` (the custom-hex
  offer), `src/ui/colour-section.ts` (the count control),
  `src/core/color-sources.ts` (`bw`, `rgb1` maps),
  `src/core/color-profile.ts` (`builtInProfiles`).
- Tone mode: TONE-01 / CREATIVE-01, for the halftone pairing.
- ICE-PROFILES-02 records three generated maps (Greys, 1-bit RGB,
  2-bit RGB) that are selectable as libraries but have no built-in
  profile — option A is the same shape of fix.
