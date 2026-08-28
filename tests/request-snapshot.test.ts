/**
 * Request snapshots (STATE-03, the D212 convention).
 *
 * A pipeline result must be read against the state it was computed
 * from, not against whatever the app holds by the time it lands. Two
 * things are pinned here.
 *
 * The first is the snapshot itself: mutate every control while a
 * request is pending, and the result must still describe what was
 * submitted.
 *
 * The second is the **discipline the shallow copy rests on**.
 * `main.ts` replaces config fields (`config.tone = {…}`) and never
 * edits what they point at (`config.tone.weight = …`), which is what
 * makes a shallow copy a complete snapshot. That is a property of the
 * app, not of the type, so it is asserted rather than trusted: the
 * day someone writes an in-place edit, this is what says a shallow
 * snapshot no longer suffices.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DITHER, type PipelineConfig } from '../src/core/pipeline/config.ts';
import { requestSnapshot } from '../src/core/pipeline/snapshot.ts';
import { defaultTone } from '../src/core/color/tone.ts';
import type { Palette } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const MAIN = fileURLToPath(new URL('../src/main.ts', import.meta.url));

function palette(name: string, rgb: [number, number, number]): Palette {
  return { name, entries: [thread('A', name, rgb)] };
}

function config(): PipelineConfig {
  return {
    preset: 'resize-first',
    grid: { width: 200, height: 200 },
    resizeMode: 'contain',
    palette: palette('before', [10, 20, 30]),
    metric: 'lab',
    dither: { ...DEFAULT_DITHER },
    tone: defaultTone(),
  };
}

describe('requestSnapshot', () => {
  it('survives every field being replaced afterwards', () => {
    const live = config();
    const snap = requestSnapshot(live);

    // Everything main.ts is capable of changing, changed.
    live.preset = 'reduce-first';
    live.grid = { width: 9, height: 9 };
    live.resizeMode = 'stretch';
    live.palette = palette('after', [200, 210, 220]);
    live.metric = 'rgb';
    live.dither = { algorithm: 'atkinson', serpentine: false, strength: 0.5 };
    live.tone = { ...defaultTone(), weight: 1 };

    expect(snap.config.preset).toBe('resize-first');
    expect(snap.config.grid).toEqual({ width: 200, height: 200 });
    expect(snap.config.resizeMode).toBe('contain');
    expect(snap.config.palette?.name).toBe('before');
    expect(snap.config.metric).toBe('lab');
    expect(snap.config.dither.algorithm).toBe(DEFAULT_DITHER.algorithm);
    expect(snap.config.tone).toEqual(defaultTone());
  });

  it('keeps palette identity, so a result names the threads it ran with', () => {
    // The COUNT-01 shape: two palettes can share a display colour, so
    // identity has to follow the submitted palette, not the current one.
    const live = config();
    const snap = requestSnapshot(live);
    const submitted = snap.config.palette?.entries[0]?.id;
    live.palette = palette('after', [10, 20, 30]); // same RGB, different palette
    expect(snap.config.palette?.entries[0]?.id).toBe(submitted);
    expect(snap.config.palette?.name).toBe('before');
  });

  it('is a copy, so writing through the snapshot cannot reach the live config', () => {
    const live = config();
    const snap = requestSnapshot(live);
    (snap.config as PipelineConfig).metric = 'rgb';
    expect(live.metric).toBe('lab');
  });

  it('takes a fresh snapshot each time', () => {
    const live = config();
    const first = requestSnapshot(live);
    live.metric = 'rgb';
    const second = requestSnapshot(live);
    expect(first.config.metric).toBe('lab');
    expect(second.config.metric).toBe('rgb');
  });
});

describe('the discipline a shallow snapshot depends on', () => {
  const source = readFileSync(MAIN, 'utf8');

  it('main.ts only ever replaces config fields, never edits them in place', () => {
    // `config.tone = {...}` is fine — the snapshot captured the old
    // object and nothing will touch it. `config.tone.weight = 1` is
    // not: it would reach through the snapshot into a value it shares.
    // Any depth: `config.a.b = x` and `config.a.b.c = x` are both reaches
    // through the snapshot into a shared value.
    const inPlace = source.match(/config(?:\.[a-zA-Z]+){2,}\s*=(?!=)/g) ?? [];
    expect(inPlace).toEqual([]);
  });

  it('never mutates a config sub-object through a method or Object.assign', () => {
    const viaMethod =
      source.match(/config(?:\.[a-zA-Z]+)+\.(?:push|pop|shift|splice|sort|reverse|fill)\(/g) ?? [];
    const viaAssign = source.match(/Object\.assign\(\s*config\./g) ?? [];
    expect([...viaMethod, ...viaAssign]).toEqual([]);
  });

  it('reads no mutable export option after awaiting the exported frame', () => {
    // The other half of STATE-03: a full-quality export takes seconds,
    // and the user can move every control while it runs.
    const mutable = /(?<!\.)\b(pdfPaging|pdfOptions|gridPrint|chartMode|symbolState|exportState)\b/g;
    for (const name of ['exportPng', 'exportChart', 'exportPdf']) {
      const at = source.indexOf(`async function ${name}(): Promise<void> {`);
      expect(at, `${name} not found`).toBeGreaterThan(-1);
      const body = source.slice(at, at + source.slice(at).search(/\n {2}\}\n/) + 4);
      const afterAwait = body.split('await client.exportFrame(')[1] ?? '';
      expect(afterAwait.match(mutable) ?? [], `${name} reads live state after awaiting`).toEqual(
        [],
      );
    }
  });
});
