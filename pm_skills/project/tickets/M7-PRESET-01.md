# M7-PRESET-01 — Curated colour-scheme presets

## Outcome

Users can preview and apply curated schemes such as pastels, earth tones,
monochrome, and limited-N. Every result resolves to real references from enabled
brands, degrades visibly when required references are unavailable, and can be
duplicated into an editable personal palette.

## Current baseline

The only presets in code are processing-order presets. There is no palette
library, thread-family taxonomy, brand-enable state, target-colour selection, or
distinction between a strict allowed palette and a preference. DMC/Anchor source
data contains names and cross-references but no authoritative curated “pastel”
or “earth” membership.

## Preset semantics

Keep two application modes explicit:

- **Strict palette:** conversion may use only the resolved preset entries.
- **Preference:** preset entries receive a documented preference during
  selection/auto-fill, but other permitted threads may be used to meet quality
  or count constraints.

A preset should be immutable built-in data with a stable ID and schema version,
not a magic name interpreted differently over time. It may contain concrete
thread identities, catalogue queries/tags, colour targets with a resolution
rule, or a combination. Whichever representation is chosen, save the exact
resolved snapshot in the project so later catalogue/preset updates do not change
historic output.

Do not infer an official colour family from English thread names alone. For
algorithmic presets such as monochrome or limited-N, define the colour-space
rule and deterministic tie-breaking. Curated artistic schemes require owner-
reviewed membership; algorithmically generated sets should be labelled as such.

## Disabled/missing brand behaviour

Resolution operates only over enabled brands. Report how many intended preset
entries resolved, which are missing/retired/disabled, and whether the remaining
set is still valid. Strict application with zero usable entries is an error;
preference application may continue only with an explicit “preference unavailable”
state. Never silently enable a brand or substitute a same-looking reference.

“Duplicate into personal palette” freezes the resolved ordered identities and
last-known display data, gives the copy a new library ID/revision, and then uses
M7-PAL-01 editing/import/export rules.

## Likely implementation surface

- Versioned preset definitions near catalogue/palette core data, with a pure
  deterministic resolver over enabled brand catalogues.
- Colour panel preset browser/preview and status/error states.
- Project snapshot/migration, palette library duplication, LUT invalidation, and
  diagnostics events that log IDs/counts rather than entire user palettes.
- Tests for strict/preference separation, missing brands, no matches, duplicate
  RGB identities, deterministic resolution, snapshot reproduction, and copy.

## Acceptance evidence

For every shipped preset, commit a small human-readable definition fixture and
assert all resolved references exist and belong to enabled brands. Disable each
brand in turn and verify an explained degradation. Preview then apply without
state loss; duplicate, edit, save, reopen, and confirm pixel/reference identity.
Curated visual quality needs an owner review on the representative M8/M7 artwork
set; unit tests can prove semantics, not artistic quality.

## Risks and dependencies

- Preset names promise taste; membership needs owner sign-off rather than an
  agent inventing authoritative palettes.
- Strict versus preference affects M7-COUNT-01 and M7-MIX-01. Define the policy
  model once.
- Depends on M7-BRAND-01/02 and M7-PAL-01.

## References

- Requirements: `docs/requirements.md` §§5–6 and §20.
- [DMC's own photo-pattern workflow](https://www.dmc.com/US/en/stitch-your-photos/help_and_advice)
  distinguishes a maximum colour request and reports unavailable threads, useful
  precedent for visible degradation rather than silent substitution.
