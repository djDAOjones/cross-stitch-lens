/**
 * Built-in grid styling presets (M11, §15–§16 preset lists). Presets
 * are immutable in-code data, not library entities: applying one
 * copies its values into the design's screen and print style blocks,
 * and any later edit makes the design honestly "Custom". The project
 * file stores canonical values — the preset id is provenance only, so
 * a preset changing in a later release can never restyle a saved
 * design.
 *
 * Lives in `src/core/` (not the worker) so the schema migration can
 * label a v6 file whose values exactly match a preset without core
 * importing outward.
 */

import { DEFAULT_GRID_VALUES, type GridStyleValues } from './grid-style.ts';

/** One built-in preset: paired screen and print style values. */
export interface GridPreset {
  /** Stable id, persisted as provenance (`gridStyle.preset`). */
  id: string;
  /** Sentence-case UI label. */
  label: string;
  screen: GridStyleValues;
  print: GridStyleValues;
}

/** The classic look: every stitch, major every 10 — the defaults. */
const EVERY_10: GridStyleValues = { ...DEFAULT_GRID_VALUES };

/**
 * The six built-ins, in menu order. "Every 10" is byte-equal to
 * `DEFAULT_GRID_VALUES` on both halves — that identity is what lets a
 * migrated v6 file with untouched styling label as the preset it
 * always looked like rather than "Custom" (asserted in tests).
 */
export const GRID_PRESETS: readonly GridPreset[] = [
  {
    id: 'no-grid',
    label: 'No grid',
    screen: { ...DEFAULT_GRID_VALUES, show: false },
    print: { ...DEFAULT_GRID_VALUES, show: false },
  },
  {
    id: 'fine',
    label: 'Fine',
    screen: {
      ...DEFAULT_GRID_VALUES,
      color: '#999999',
      minorDash: true,
      borderThickness: 2,
    },
    print: {
      ...DEFAULT_GRID_VALUES,
      color: '#999999',
      minorDash: true,
      borderThickness: 2,
      tickFontPx: 12,
    },
  },
  {
    id: 'every-5',
    label: 'Every 5',
    screen: { ...DEFAULT_GRID_VALUES, majorInterval: 5 },
    print: { ...DEFAULT_GRID_VALUES, majorInterval: 5, tickFontPx: 12 },
  },
  {
    id: 'every-10',
    label: 'Every 10',
    screen: EVERY_10,
    print: { ...EVERY_10 },
  },
  {
    id: 'traditional',
    label: 'Traditional',
    screen: {
      ...DEFAULT_GRID_VALUES,
      color: '#b0b0b0',
      majorColor: '#333333',
      borderThickness: 3,
      borderColor: '#333333',
      tickFontPx: 12,
    },
    print: {
      ...DEFAULT_GRID_VALUES,
      color: '#b0b0b0',
      majorColor: '#333333',
      borderThickness: 3,
      borderColor: '#333333',
      tickFontPx: 13,
    },
  },
  {
    id: 'high-contrast-print',
    label: 'High-contrast print',
    screen: {
      ...DEFAULT_GRID_VALUES,
      majorColor: '#000000',
      borderThickness: 3,
      borderColor: '#000000',
      tickFontPx: 12,
    },
    print: {
      ...DEFAULT_GRID_VALUES,
      color: '#000000',
      majorColor: '#000000',
      majorThickness: 3,
      borderThickness: 4,
      borderColor: '#000000',
      tickFontPx: 14,
    },
  },
];

/** Preset lookup by id; undefined for unknown (forward-friendly). */
export function gridPresetById(id: string): GridPreset | undefined {
  return GRID_PRESETS.find((p) => p.id === id);
}

/** Field-by-field equality of two style-value blocks. */
function valuesEqual(a: GridStyleValues, b: GridStyleValues): boolean {
  return (
    a.show === b.show &&
    a.minorInterval === b.minorInterval &&
    a.majorInterval === b.majorInterval &&
    a.color === b.color &&
    a.majorColor === b.majorColor &&
    a.minorThickness === b.minorThickness &&
    a.majorThickness === b.majorThickness &&
    a.opacity === b.opacity &&
    a.minorDash === b.minorDash &&
    a.borderThickness === b.borderThickness &&
    a.borderColor === b.borderColor &&
    a.ticks === b.ticks &&
    a.tickFontPx === b.tickFontPx
  );
}

/**
 * The preset both halves exactly match, or null. Used by the v6 → v7
 * migration to label untouched styling, and by the UI to keep the
 * select honest after a load. Exact match only — "close" is Custom.
 */
export function matchGridPreset(
  screen: GridStyleValues,
  print: GridStyleValues,
): string | null {
  for (const preset of GRID_PRESETS) {
    if (valuesEqual(screen, preset.screen) && valuesEqual(print, preset.print)) {
      return preset.id;
    }
  }
  return null;
}
