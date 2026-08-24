# ICE-PROFILES-02 — built-in colour profiles: the unbuilt candidates

The candidate queue that outlived M15-GALLERY-01. That item shipped
sixteen built-in style profiles in two owner-signed batches (D140,
D146) and the owner closed it at sixteen on 2026-08-09 — but asked
that the unbuilt candidates be kept for a later review rather than
cut. This file is that list; the item is iceboxed, not scheduled.

The queue now holds **100 unsigned ideas** in two pools: the original
forty (D146) and a second pool of sixty drafted 2026-08-24 (D204).
None has a rule, a membership, or test-image evidence. Nothing here
may reach the profile select without going through the same batch
process the shipped sixteen did.

## The process, if this is ever reactivated

Carried over from M15-GALLERY-01, which proved it twice:

- Agent drafts candidates in batches of roughly 6–10: a range rule
  where the style is honestly rule-shaped, curated membership where it
  is taste-shaped. Each candidate ships with test-image evidence.
- The owner curates each batch — names and membership/rules — and
  signs it. Only signed batches ship as built-ins.
- **Naming:** style-descriptive, never trademarks. "Fluoro spot print"
  is the shipped example — it is this list's "Risograph print" renamed
  off a trademark, and `riso` now sits in the naming guard.
- Built-ins are read-only and duplicate-to-edit, distinguished from
  user profiles (M15-CORE-02).
- The evidence run is reproducible and must be quoted, not re-derived:
  `npm run audit` → `tests/audits/profile-gallery.audit.test.ts`
  renders every built-in on the sample card and writes the table plus
  a JSON artefact. Since D147 the editor's preview also judges a
  profile against six real photographs, which the first two batches
  did not have.
- A profile is the **eligible universe, not the palette**: its rule
  narrows the catalogue, and the design's colour limit then selects
  from what survives. A healthy one resolves in the hundreds. Judging
  a candidate by entry count is a category error.

## Lightness ladders are admissible (D204)

The second pool was first drafted with single-hue lightness ladders
held back, on the reading that CREATIVE-01's "the ramp control and a
'ramp' profile shape must not collide" excluded them. **The owner
ruled otherwise on 2026-08-24: ladders are fine as palettes.**

The consequence is worth stating, because it is the opposite of a
collision. A ladder profile feeding tone mode is the *pairing the two
features were built for* — a narrow ordered ramp as the eligible
universe, matched by the tone metric, is exactly gradient-map
behaviour, reached through two controls that already exist. The
warning in CREATIVE-01 is about the **control shape and the naming**
not colliding, not about the membership being forbidden.

Two things follow for drafting:

- A ladder is where **order is identity** (D46) bites hardest. It
  ships written light-to-dark and is judged in that order.
- Ladder candidates need their evidence read at a *low* colour limit
  as well as the default eight. A five-rung ladder selected down to
  eight is the whole profile; the same rule against a photograph at
  limit 20 is a different claim.

Queued **Sashiko indigo** (pool A) is a ladder and no longer needs
re-filing. Pool B's **Nautical chart** keeps its depth bands.

---

## Pool A — the original forty (D139/D146 era)

### Candidates — culture (19)

- **Movements and eras:** Impressionist water-lilies, Art nouveau,
  Bauhaus, Pop art (Warhol), Memphis, Baroque gold, Rococo pastel.
- **Design and media:** Technicolor, Vaporwave, Y2K chrome, Rave
  flyer, 8-bit arcade, Cosy pixel farm.
- **Craft and place:** Talavera tile, Batik, Kilim, Sashiko indigo,
  Terracotta and lime, Scandinavian winter.

### Candidates — nature (21)

- **Seasons and light:** Summer coast, Dawn mist, Storm light, Aurora.
- **Biomes:** Desert bloom, Coral reef, Alpine, Tundra, Wetland reeds.
- **Flora and fauna:** Wildflower verge, Succulents, Butterfly wing,
  Plumage, Beetle shell, Lichen and bark, Autumn fungi, Rock pool.
- **Mineral and sky:** Opal fire, Slate and moss, Sandstone canyon,
  Night sky.

**Two names in pool A now fail the naming guard** and must be renamed
before they are ever drafted: *Technicolor* (a live mark, and the
proof that a fixed guard list cannot catch what nobody thought of)
and *Pop art (Warhol)* (an artist whose estate enforces). *Talavera
tile* carries a Mexican denomination of origin and wants the owner's
call.

---

## Pool B — the second pool, sixty candidates (D204)

Picked against gaps rather than down a list of names, the way batch 2
was. The gallery still has **no red** (Autumn leaves begins at hue 10
and is orange in practice), **no violet**, **no achromatic ladder**,
**no all-hue dark** (Deep sea is cool, Rainforest is green), **one
two-pole shape** (Neon noir), and **nothing from industry**.

Pool B leans curated — 14 rule-shaped and 8 ladders against 38
curated, next to a shipped gallery that is 9 rule to 7 curated. That
is the untouched territory being what it is: industry, systems and
early-computing palettes were *specified by somebody*, so a
colour-space band would misdescribe them. Batches drawn from this pool
must reach for the rule-shaped candidates deliberately.

### Proposed batch three (4 rule + 4 curated)

The batch-2 split, with every entry closing a named gap:

| Candidate | Shape | Closes |
| --- | --- | --- |
| Grisaille | rule | achromatic — no thread-based neutral set exists |
| Chiaroscuro | rule, 2 bands | all-hue dark — every dark profile is hue-locked |
| Vermilion and madder | rule | red — nothing in the gallery owns it |
| Teal and orange | rule, 2 bands | warm/cool poles — Neon noir is magenta/cyan |
| Anodised aluminium | curated | violet — the largest unclaimed region |
| Heraldic tinctures | curated | violet again, via a defined historical system |
| High-visibility safety | curated | acid, and the first industry entry |
| Transit map lines | curated | distinguishability — directly useful in a chart |

### Art and pigment (10)

The queued forty covers movements; this covers **materials** — what a
medium physically permits, which rules more honestly than a movement.

- **Grisaille** *(rule)* — the paint-in-greys underpainting: near-zero
  chroma across the full lightness range.
- **Chiaroscuro** *(rule, 2 bands)* — any hue at very low brightness,
  plus a narrow high-key band. The gap between them is the style.
- **Vermilion and madder** *(rule)* — the red arc alone, scarlet
  through crimson to rose, held at chroma so it never drifts to brick.
- **Fresco lime plaster** *(rule)* — what survives wet lime: earth
  hues capped at middling chroma, held bright. *Check: Sepia.*
- **Verdigris and bronze** *(rule)* — copper oxides against warm
  unweathered metal. Fills the seam between Rainforest and Deep sea.
- **Sumi ink wash** *(ladder)* — a warm-black dilution ladder. The
  warm counterpart to Grisaille's cool.
- **Cave ochre and charcoal** *(curated)* — red ochre, yellow ochre,
  charcoal, chalk white. Four or five entries; tests the count floor.
- **Egg tempera and gold ground** *(curated)* — vermilion, lapis,
  ochre, verdigris, gold, ivory.
- **Expressionist woodcut** *(curated)* — black, raw white, one or two
  unmixed colours. Deliberate counterweight to Ukiyo-e's refinement.
- **Botanical plate** *(curated)* — hand-coloured engraving on cream.
  *Check: Spring meadow.*

### Design and print (8)

Sets somebody specified for a reason, so curated is the truthful shape.

- **Terrazzo** *(rule, 2 bands)* — a pale ground band plus all-hue
  mid-chroma chips. The split is the material.
- **Brutalist concrete** *(rule)* — near-neutral mids with a cool
  cast, plus rust and moss staining. *Check: Moorland — may be
  redundant.*
- **Transit map lines** *(curated)* — one entry per hue sextant at
  maximum mutual separation. Legibility as membership.
- **Anodised aluminium** *(curated)* — the violet-blue, acid green,
  gold, red, and raw silver.
- **Vitreous enamel signage** *(curated)* — deep blue, white, red,
  black. *Check: De Stijl primaries.*
- **International typographic** *(curated)* — red, black, white, one
  grey.
- **Constructivist** *(curated)* — red, black, cream, ochre. The
  warmer, dirtier cousin. *Ship at most one of these two.*
- **Ceramic glaze** *(curated)* — celadon, tenmoku, oxblood, ash,
  iron. Muted-but-deep, between Moorland and Deep sea.

### Industry and infrastructure (8)

Entirely new territory — neither pool A nor the shipped sixteen holds
a single industrial entry, and membership here is documented fact
rather than taste.

- **Shipping container** *(rule)* — everything faded by a year at sea:
  mid chroma across all hues. *Check: Moorland.*
- **High-visibility safety** *(curated)* — fluoro yellow-green and
  orange against black and retroreflective silver.
- **Hazard and warning** *(curated)* — yellow on black, white on red,
  white on blue. *Overlaps the above at yellow; ship at most one.*
- **Machinery and plant** *(curated)* — plant green-grey, dust yellow,
  oxide primer red, black.
- **Maritime signal flags** *(curated)* — red, yellow, blue, black,
  white. Five colours fixed by a real system; the cleanest curated
  case in the pool.
- **Railway livery** *(curated)* — bottle green, maroon, cream, black,
  with fine lining. The lining is one stitch wide, which suits the
  medium exactly.
- **Cockpit instrument** *(curated)* — dark panel grey-green, amber,
  white, warning red. A palette designed to be read in the dark.
- **Circuit board** *(curated)* — solder-mask green, gold pad, black
  component, tinned silver, red and blue wire.

### Early computing (7)

Added at the owner's request, 2026-08-24. The category needs unusual
care in two directions: **three obvious entries are already shipped**
(see "Already covered"), and every machine that defined a palette also
defined a trademark, so all seven are named by mechanism.

- **Handheld green LCD** *(ladder)* — four greens, no more. The
  clearest ladder in the pool and instantly recognisable.
- **Green phosphor** *(ladder)* — black to a single green, by
  brightness alone.
- **Amber phosphor** *(ladder)* — the same shape one hue over. Ship
  both or neither; they are a pair, not a duplicate.
- **Four-colour adapter** *(curated)* — black, cyan, magenta, white;
  the alternate mode swaps in red, green and dark yellow. The
  *restriction* is the style, which is why it is not Retro 16.
- **Composite artefact colour** *(curated)* — the purple, green, blue
  and orange fringes that appeared where no colour was sent. Nothing
  in the gallery resembles it.
- **Home micro brights** *(curated)* — eight hues at two brightness
  levels. Distinct from 1-bit RGB *because* of the dim/bright pairing,
  which is the whole character. *Verify that distinction first.*
- **Home console** *(curated)* — the washed, low-contrast console
  palette with no true saturation at the extremes. *Check: pool A's
  8-bit arcade — arcade boards carried far more colour, but confirm.*

### Photography and film (6)

The strongest rule-shaped seam: a stock or a grade *is* a
transformation of colour space, and users recognise these without
being told the name.

- **Teal and orange** *(rule, 2 bands)* — a warm skin arc against a
  cool shadow arc, with the greens and magentas left out.
- **Cross-processed** *(rule, 2 bands)* — highlights pushed
  yellow-green, shadows pushed cyan-blue. Hue split by brightness,
  which no shipped profile does.
- **Instant film** *(rule)* — milky and warm: low chroma at mid-to-high
  brightness with the hue range skewed off neutral. *Check: Pastels.*
- **Sun-bleached print** *(rule)* — cyan dye fades first, so a print
  drifts magenta-yellow. *Check: Sepia — this keeps pink.*
- **Bleach bypass** *(rule)* — chroma stripped, blacks kept. **Likely
  redundant against Grisaille and Moorland; verify before drafting.**
- **Screen-plate colour** *(curated)* — the earliest colour
  photography: soft orange-red, green and blue-violet grains over a
  warm haze. Named by process, not by the maker's mark.

### Textile and dye (7)

Closest to the product's own world and easiest to over-fill. Pool A
already holds Batik, Kilim and Sashiko indigo; **a batch should take
at most two from here.**

- **Natural dye garden** *(curated)* — weld yellow, madder red, woad
  blue, walnut brown, onion gold. What a dye plot actually yields.
- **Indigo dip** *(ladder)* — each dip darkens the last. *Check:
  pool A's Sashiko indigo, which is the same shape.*
- **Tartan sett** *(curated)* — bottle green, navy, deep red, black,
  with white and yellow overchecks one thread wide. *Check: Fair Isle.*
- **Undyed fleece** *(curated)* — white, oatmeal, moorit brown, grey,
  black. **Overlaps Fair Isle, which opens on undyed wool (3866,
  3045); verify first.**
- **Kente** *(curated)* — gold, maroon, forest green, black, blue.
  *Cultural naming — owner's call.*
- **Suzani** *(curated)* — madder, indigo, saffron, cream. *Check:
  pool A's Kilim — same dye tradition, different cloth.*
- **Sari and zari** *(curated)* — saturated silk grounds shot with
  metallic gold. *Check: Gemstones, which is chroma with no metal.*

### Systems, maps and the laboratory (5)

Palettes somebody standardised and wrote down, so membership is a
matter of record — the least contestable curated candidates here.

- **Heraldic tinctures** *(curated)* — gules, azure, vert, sable, or,
  argent, purpure. Seven colours fixed for eight centuries.
- **Laboratory stain** *(curated)* — haematoxylin blue-purple against
  eosin pink, on white. Fills the violet-to-pink corner.
- **Geological map** *(curated)* — the stratigraphic period colours:
  pale yet oddly saturated, standardised internationally.
- **Topographic map** *(curated)* — buff contours, blue water,
  woodland green, road orange, grey grid on white. Describe by
  convention; **never name a national mapping agency.** *Legibility-
  driven like Transit map lines; at most one per batch.*
- **Nautical chart** *(curated)* — buff land, depth-banded blues,
  magenta symbols, black soundings.

### Heat, light and sky (3)

Three ladders, admissible since D204. Grouped by what they describe
graduated light rather than by where they come from.

- **Foundry heat** *(ladder)* — black through cherry red, orange and
  yellow to white. The blackbody curve; the most legible ramp here.
- **Stellar temperature** *(ladder)* — red through white to blue. A
  ladder that crosses hue rather than staying on one.
- **Cyanotype** *(ladder)* — paper white to Prussian blue, with
  nothing between but dilution.
- **Storm light** — *already in pool A.* Listed here only so the
  territory reads whole.

### Vernacular and place (6)

Nobody designed these; they accumulated. Hardest to defend as rules,
most likely to charm — which is what the batch signature is for.

- **Institution green** *(rule)* — the pale green-grey of hospitals,
  schools and swimming baths: narrow, cool, low chroma, held bright.
  Fills light-and-muted-with-hue; Pastels is hue-free.
- **Allotment and shed** *(curated)* — creosote brown, sage paint,
  terracotta pot, galvanised grey. *Check: Moorland.*
- **Fairground and carousel** *(curated)* — red, gold, cream, deep
  green, mirror silver. *Check: pool A's Rave flyer — ornate, not flat.*
- **Enamelware kitchen** *(curated)* — cream body, deep green or navy
  trim, one red handle. *Overlaps Vitreous enamel signage in material.*
- **Sports pitch and playground** *(curated)* — primary plastics on
  pitch green and asphalt grey, white line-marking through it.
- **Harbour town** *(curated)* — chalky pinks, blues and ochres
  against white, weathered. **Close to pool A's Summer coast; compare
  before drafting.**

---

## Investigations to settle before drafting

Each is answered by resolving the candidate against the live
catalogue in the audit run and comparing entry sets — cheap once a
rule exists, and wasted effort before then. Recorded so a drafting
session does not rediscover them.

| # | Question | Settles |
| --- | --- | --- |
| 1 | Does **Bleach bypass** resolve to a subset of Grisaille or Moorland? | Whether it ships at all |
| 2 | Does **Undyed fleece** overlap Fair Isle's undyed opening? | Whether it ships at all |
| 3 | Does **Brutalist concrete**'s cool cast separate it from Moorland? | Whether it ships at all |
| 4 | Is **Harbour town** distinguishable from pool A's Summer coast? | Which of the two is drafted |
| 5 | Does **Home micro brights**' dim/bright pairing survive as membership, or collapse into 1-bit RGB? | Whether it ships at all |
| 6 | Does **Home console** separate from pool A's 8-bit arcade? | Whether both can ship |
| 7 | Does **Indigo dip** differ from pool A's Sashiko indigo? | Which of the two is drafted |
| 8 | International typographic vs Constructivist; High-visibility vs Hazard; Transit map vs Topographic | One of each pair per batch |
| 9 | Do ladder candidates read at colour limits below 8 as well as at the default? | The D204 evidence rule |

## Already covered — do not propose

Recorded so the same suggestions do not arrive again.

| Suggestion | Already is |
| --- | --- |
| Teletext eight | **1-bit RGB** — the same eight saturated corners, exactly |
| Desktop 16 / EGA / VGA 16 | **Retro 16** — the HTML4/VGA named set in VGA index order |
| Dithered web palette | **Web-safe** — the 216 |
| Workstation greyscale | **Greys** map, plus Grisaille above |
| Harris tweed / Heather | **Moorland**, almost exactly |
| Stained glass | **Gemstones** plus a dark floor — and it collides with a demo-image name |
| Slide film | **Gemstones** |
| Autumn woodland | **Autumn leaves** |
| Ocean depths | **Deep sea** |
| Seaside pastels | Pool A's **Summer coast**, plus Pastels |
| Camouflage | **Moorland** |
| Psychedelic poster | Pool A's **Rave flyer** |
| Adire / Shibori | Pool A's **Sashiko indigo** |
| Persian carpet | Pool A's **Kilim** |
| Watercolour wash | **Pastels** |

## Naming

No pool B name trips the guard. Three notes:

- **Two names were pre-emptively changed at draft.** "Screen-plate
  colour" avoids the mark on the early colour process; "Sports pitch"
  avoids a trademarked road-surface name. Same failure mode that
  turned Risograph print into Fluoro spot print.
- **The guard was extended (D204)** with film, print, material and
  early-computing marks — `technicolor`, `kodachrome`, `polaroid`,
  `formica`, `perspex`, `tarmac`, `astroturf`, `day-glo`, `letraset`,
  `atari`, `amiga`, `sega`, `game boy`. `spectrum` and `commodore`
  were **deliberately left out** and are asserted as passing: both are
  ordinary words before they are machines, and the D139 lesson is that
  a guard rejecting a legitimate name is worse than no guard.
- **Cultural names need the owner's explicit call.** Kente, Suzani and
  Sari in pool B; Talavera tile and Pop art (Warhol) in pool A. Fair
  Isle and Ukiyo-e set the precedent that place and tradition names
  are acceptable; where the cloth and the people have different names,
  prefer the cloth.

## What drafting actually costs (measured 2026-08-24)

**The machine cost is nil.** `AUDIT=1 vitest run
tests/audits/profile-gallery.audit.test.ts` renders all 25 built-ins
through the real pipeline in **~1.7 s**, reporting per profile: entry
count, distinct colours, and the eight selected colours with brand,
reference and percent share of the image. At 125 profiles it would
still be seconds. **Iterate freely** — the draft → run → read shares →
retune loop is free, and D139 proved it is necessary: Neon noir was
retuned twice and Delft blue lost an entry under exactly this loop.

**The cost is judgement, and it splits three ways:**

| Class | Rough cost each | Why |
| --- | --- | --- |
| Rule-shaped | 15–30 min | Three number pairs. Falsifiable — the audit says if it is wrong. |
| Ladder | 20–40 min | Ordered rungs from the catalogue, judged at a low colour limit too. Even L\* steps can be computed rather than guessed. |
| Curated | 30–60 min | Choosing 5–11 threads from 3,338 to embody a style. The taste-shaped half. |

Pool A's forty are worse: they have never had a *shape* decided, so
that judgement comes first.

**All 100 is therefore roughly 10–14 drafting sessions — and about 13
owner sittings**, since D115 signs batches of 6–10. The signature, not
the drafting, is the real rate limit. That is worth knowing before
anyone commits to the queue.

## Do not build all one hundred

The gallery closed at sixteen deliberately, and the menu is the
evidence that finishing the queue is the wrong goal: 25 built-ins today
sit in a flat `<select>`, 33 after batch three, and **125 would be
indefensible**. A 125-profile gallery is a worse product than a
33-profile one.

- **MENU-01** groups the menu and is the precondition for batch three.
  It is sized for a few dozen profiles, not hundreds.
- **ICE-PICKER-01** is what a genuinely large gallery would need —
  search and selectable tags — and its trigger is one optgroup passing
  ~25, which today's Styles group (19, or 27 after batch three) would
  reach on a *second* signed batch.

The triage board and `docs/palette-candidates.csv` exist so the queue
gets **cut** before it gets built. Treat the hundred as a menu to
choose from, never as a backlog to clear.

## The cheapest useful next move

If this item wakes and a full batch is not wanted, draft **the 14
rule-shaped pool-B candidates only**, run the audit, and report which
resolve healthily and which collapse. About one session, and the best
value available, because:

- a range rule is three numbers, so no taste is smuggled in and it
  cannot pre-empt the owner's signature the way a curated list would;
- it **tests the gap claims rather than restating them** — whether
  Vermilion and madder actually finds reds, whether Grisaille finds a
  real neutral ladder, whether Chiaroscuro's dark band collapses the
  way Neon noir's floor did twice before it was retuned;
- several candidates would likely die in it, which is the point, and
  dying there costs no owner time.

It returns an evidence table, not a proposal.

## Three maps that could be profiles today

`Greys` (4 even levels), `1-bit RGB` (the 8 corners) and `2-bit RGB`
(64) are generated by `core/color-sources.ts` and are already
selectable as *libraries* in the profile editor — but none has a
built-in profile of its own, so none appears in the profile menu. Each
is a one-line addition to `builtInProfiles()`, in the same shape as the
shipped `Black & white` / `Retro 16` / `Web-safe` entries.

Not done at D204: adding a profile to the gallery is a gallery change
and therefore owner-signed. But it is the cheapest three entries
available, and `1-bit RGB` in particular is the one TWOCOLOUR-01 finds
actively misleading — eight colours under a name people read as two.

## Shareable sheet

`docs/palette-candidates.csv` carries all 100 candidates with pool,
category, shape, description and status, for review outside the repo.
Regenerate expectations there if this file changes.
