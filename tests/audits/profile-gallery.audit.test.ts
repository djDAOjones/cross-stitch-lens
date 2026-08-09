/**
 * M15-GALLERY-01 — the batch evidence run, made reproducible.
 *
 * D139 set the evidence format for the profile gallery: every
 * candidate rendered through the **real pipeline** on the generated
 * sample card, reported as the colours it actually selected with each
 * colour's share of the rendered image. Batch 1 produced that by hand,
 * so batch 2 had to reconstruct the method from the published sheet
 * before it could add to it. This file is the method written down: the
 * eligible count alone cannot say whether a style reads, and the
 * render that can say it should not be rediscovered every batch.
 *
 * The render is the app's own default, not a convenient approximation:
 * a 300 x 300 grid, `resizeMode: 'contain'`, the default eight-colour
 * limit, CIELAB matching, and the default Floyd–Steinberg dither.
 * Dithering belongs in the answer because it is what turns a hard edge
 * into a mix — reporting undithered shares would report an image
 * nobody sees.
 *
 * Gated behind `AUDIT=1` (`npm run audit`) with the other audits: it
 * is evidence for a human decision, not a gate. Its assertions are
 * only the ones a broken run would trip — whether a style reads is the
 * owner's call, and no threshold substitutes for it (D139).
 */

import { describe, expect, it } from 'vitest';

import {
  builtInProfiles,
  emptyRecipe,
  resolveProfileMembership,
  type ColorProfile,
} from '../../src/core/color-profile.ts';
import { log } from '../../src/diagnostics/log.ts';
import type { PermittedSet } from '../../src/core/palette-policy.ts';
import { buildDistribution, selectPalette } from '../../src/core/palette-selection.ts';
import {
  buildStages,
  DEFAULT_DITHER,
  type PipelineConfig,
} from '../../src/core/pipeline/config.ts';
import { runPipeline } from '../../src/core/pipeline/index.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { computeStats } from '../../src/core/stats.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import { sampleBuffer } from '../../src/ui/sample.ts';
import { buildIdentity, writeReport } from '../bench/env-node.ts';
import { AUDIT } from './audit.ts';

/** The evidence geometry — the app's defaults, stated once. */
const GRID = 300;
const COLOR_LIMIT = 8;

/** One profile's row: what it offers, and what it actually chose. */
interface ProfileEvidence {
  name: string;
  /** Resolved table size — the eligible universe, not the palette. */
  entries: number;
  /** Distinct colours among them: what the bounds count (D139). */
  distinct: number;
  picks: { hex: string; ref: string; label: string; percent: number }[];
}

describe.skipIf(!AUDIT)('M15-GALLERY-01 profile gallery evidence (AUDIT=1)', () => {
  it('renders every built-in on the sample card', () => {
    const catalogue = loadCatalogue();
    const source = sampleBuffer();
    // Selection reads the resized source, exactly as the app does:
    // resize comes first (D3), so a bin's weight counts stitches.
    const grid = resizeStage.backends.ts(source, {
      width: GRID,
      height: GRID,
      mode: 'contain',
    });
    const distribution = buildDistribution(grid);

    const evidence = (profile: ColorProfile): ProfileEvidence | null => {
      const resolved = resolveProfileMembership(profile.recipe, { catalogue });
      // "My threads" resolves to nothing without an inventory, and has
      // no fixed appearance to show; that is absence, not evidence.
      if (resolved.entries.length === 0) return null;
      const permitted: PermittedSet = {
        eligible: resolved.entries,
        locks: [],
        preferred: new Set<string>(),
        unresolved: [],
        conflicts: [],
        ok: resolved.ok,
      };
      const { palette } = selectPalette(permitted, COLOR_LIMIT, distribution, profile.name);
      const config: PipelineConfig = {
        preset: 'resize-first',
        grid: { width: GRID, height: GRID },
        resizeMode: 'contain',
        palette,
        metric: 'lab',
        dither: { ...DEFAULT_DITHER },
      };
      const stats = computeStats(runPipeline(source, buildStages(config)), palette);
      return {
        name: profile.name,
        entries: resolved.entries.length,
        distinct: new Set(resolved.entries.map((t) => t.hex)).size,
        picks: stats.perColor.map((c) => ({
          hex: c.hex,
          ref: c.thread === undefined ? '?' : `${c.thread.brandId} ${c.thread.reference}`,
          label: c.thread?.name ?? '',
          percent: c.percent,
        })),
      };
    };

    const catalogueDistinct = new Set(
      resolveProfileMembership(
        { ...emptyRecipe(), libraries: catalogue.brands.map((b) => b.id) },
        { catalogue },
      ).entries.map((t) => t.hex),
    ).size;

    const rows: ProfileEvidence[] = [];
    for (const profile of builtInProfiles(catalogue)) {
      const row = evidence(profile);
      if (row !== null) rows.push(row);
    }

    log.info(
      'audit',
      [
        '',
        `M15-GALLERY-01 evidence — sample card ${String(GRID)}×${String(GRID)}, ` +
          `limit ${String(COLOR_LIMIT)}, lab, floyd-steinberg; ` +
          `catalogue holds ${String(catalogueDistinct)} distinct colours`,
        ...rows.flatMap((row) => [
          '',
          `## ${row.name} — ${String(row.entries)} entries / ${String(row.distinct)} distinct`,
          ...row.picks.map((p) =>
            `   ${p.hex} ${p.percent.toFixed(1).padStart(5)}%  ${p.ref} ${p.label}`.trimEnd(),
          ),
        ]),
      ].join('\n'),
    );

    const path = writeReport(
      `audit-m15-gallery-01-${buildIdentity().gitSha}.json`,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          startedAt: new Date().toISOString(),
          build: buildIdentity(),
          grid: GRID,
          colorLimit: COLOR_LIMIT,
          catalogueDistinct,
          profiles: rows,
        },
        null,
        2,
      )}\n`,
    );
    log.info('audit', `artefact written: ${path}`);

    // A profile that selects nothing, or whose shares do not add up,
    // means the run is broken rather than the style being wrong.
    for (const row of rows) {
      expect(row.picks.length, `${row.name} selected nothing`).toBeGreaterThan(0);
      const total = row.picks.reduce((sum, p) => sum + p.percent, 0);
      expect(total, `${row.name} shares do not total 100%`).toBeCloseTo(100, 1);
    }
  });
});

describe.runIf(!AUDIT)('M15-GALLERY-01 profile gallery evidence (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
