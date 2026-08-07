# M15-CORE-01 — Colour sources: maps, namespaces, names

Scope parent: D114 (signed scope). Pure core; no UI in this task.

## Identity grammar

- Map entries: `map:<mapId>:<code>` (e.g. `map:websafe:CC0033`,
  `map:rgb1:red`). `<code>` is stable per map — hex for computed
  maps, a name where the map defines one.
- User colours: `user:<id>` with a generated stable id; RGB is
  display data, the id is identity — exactly the thread rule
  (D55/D56), applied to non-threads.
- The namespaces are structurally incapable of colliding with
  `brandId:reference`: reserved prefixes, validated at parse.

## Maps (v1 — generated in code, deterministic, no data files)

| id | name | entries |
| --- | --- | --- |
| `bw` | Black & white | 2 |
| `grey4` | Greys | 4 |
| `rgb1` | 1-bit RGB | 8 |
| `retro16` | Retro 16 | 16 |
| `rgb2` | 2-bit RGB | 64 |
| `websafe` | Web-safe | 216 |

4-bit/channel (4,096) is deliberately out (D114). Retro 16 is the
classic 16-colour set — the exact palette is picked at build and
recorded in the generator's comment.

## Names

- Embedded CSS/X11 table (~150 entries) as a code constant —
  public-standard data, not owner data, not a protected file.
- Display rule: exact RGB match → the name ("Yellow"); otherwise
  hex. The 1-bit RGB map gets full exact names — note CSS "green"
  is #008000, so the map's #00FF00 is "Lime"; label by exact match
  only, never nearest-guess in v1.
- Labels compose provenance-honest strings for lists and export
  keys: "Web-safe #CC0033", "Custom — Crimson". Thread labels are
  untouched — manufacturer identity always.

## Done when (expanded)

- Generators pure and deterministic, tested for identity, count,
  ordering and channel values.
- Name lookup tested: exact hit, miss→hex, the lime/green case.
- A map/user entry carries a display label exports can use;
  end-to-end export-key labelling lands at M15-ACCEPT-01.
