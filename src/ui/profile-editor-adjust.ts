/**
 * The adjustment profile kind (ADJUST-01, CREATIVE-01 slice 2a, D116):
 * a profile is a complete named {@link AdjustParams} — one three-point
 * lightness curve carrying the black and white points at its ends,
 * plus global saturation — mounted in the same kind-agnostic takeover
 * shell the colour and dither kinds proved. The third kind, and the
 * shell takes it without change.
 *
 * The nine shipped presets seed the read-only built-ins with their
 * basis lines kept as the editor's "Why:" (the D61/D116 pattern).
 * Membership and names were signed at D203.
 *
 * No inline tuning outside the editor (D116): the design's Processing
 * section carries a profile select and this editor, nothing more.
 */

import { defaultAdjust, MAX_SATURATION, type AdjustParams } from '../core/pipeline/adjust.ts';
import { ADJUST_PRESETS, sameAdjust } from '../core/pipeline/adjust-presets.ts';
import type { CurvePoint, LightnessCurve } from '../core/color/curve.ts';
import type { ProfileRecord } from '../library/records.ts';
import type { LibraryStore } from '../library/store.ts';
import { createCurveControl } from './curve-control.ts';
import type {
  KindFormHandle,
  ProfileKindAdapter,
  ProfileView,
} from './profile-editor.ts';

/** What the adjust kind needs from the host. */
export interface AdjustKindDeps {
  store(): LibraryStore;
}

/** Clamp a number into a range, falling back for anything unreadable. */
function bounded(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Guard a stored payload into complete params, safely.
 *
 * Library records are the user's own data but not the schema's — a
 * file hand-edited or written by a future build must degrade to
 * something renderable, never throw inside the editor.
 */
export function asAdjustParams(payload: unknown): AdjustParams {
  if (typeof payload !== 'object' || payload === null) return defaultAdjust();
  const raw = payload as { curve?: unknown; saturation?: unknown };
  const fallback = defaultAdjust();
  const source = Array.isArray(raw.curve) ? raw.curve : [];
  const points = fallback.curve.map((seed, i): CurvePoint => {
    const entry = source[i];
    if (typeof entry !== 'object' || entry === null) return { ...seed };
    const point = entry as { in?: unknown; out?: unknown };
    return {
      in: bounded(point.in, 0, 100, seed.in),
      out: bounded(point.out, 0, 100, seed.out),
    };
  });
  // Inputs must not cross: the maths reads them as an ordered pair of
  // segments, so a crossed pair from a bad payload is straightened
  // here rather than silently mapped through a zero-width segment.
  const [lo, mid, hi] = points as [CurvePoint, CurvePoint, CurvePoint];
  mid.in = Math.max(lo.in, mid.in);
  hi.in = Math.max(mid.in, hi.in);
  return {
    curve: [lo, mid, hi] as LightnessCurve,
    saturation: bounded(raw.saturation, 0, MAX_SATURATION, 1),
  };
}

/** Saturation as the slider shows it: a percentage of the original. */
export function saturationToPercent(saturation: number): number {
  return Math.round(saturation * 100);
}

/** The slider's percentage back to a factor, at the stored precision. */
export function percentToSaturation(percent: number): number {
  return Math.round(percent) / 100;
}

/** Build the adjust kind for the takeover shell. */
export function createAdjustKindAdapter(
  doc: Document,
  deps: AdjustKindDeps,
): ProfileKindAdapter & { resolveDraftParams(draft: unknown): AdjustParams } {
  const store = (): LibraryStore => deps.store();
  let records = new Map<string, ProfileRecord>();
  let names = new Map<string, string>();
  /** Ids are minted from the record count; the store is the authority. */
  const mintId = (): string => `a-${Date.now().toString(36)}-${String(records.size)}`;

  const adapter: ProfileKindAdapter & { resolveDraftParams(draft: unknown): AdjustParams } = {
    kind: 'adjust',
    title: 'Adjustment profiles',

    async list(): Promise<ProfileView[]> {
      const stored = await store().listProfiles('adjust');
      records = new Map(stored.map((r) => [r.id, r]));
      names = new Map([
        ...ADJUST_PRESETS.map((p): [string, string] => [`builtin:${p.id}`, p.label]),
        ...stored.map((r): [string, string] => [r.id, r.name]),
      ]);
      return [
        ...ADJUST_PRESETS.map((p) => ({
          id: `builtin:${p.id}`,
          name: p.label,
          builtin: true,
          revision: 0,
        })),
        ...stored.map((r) => ({
          id: r.id,
          name: r.name,
          builtin: false,
          revision: r.revision,
        })),
      ];
    },

    draftOf(id: string): Promise<unknown> {
      const preset = ADJUST_PRESETS.find((p) => `builtin:${p.id}` === id);
      if (preset !== undefined) return Promise.resolve(structuredClone(preset.params));
      return Promise.resolve(asAdjustParams(records.get(id)?.payload));
    },

    async save(id: string, draft: unknown): Promise<ProfileView> {
      const current = records.get(id);
      const record: ProfileRecord = {
        kind: 'adjust',
        id,
        name: current?.name ?? names.get(id) ?? 'Profile',
        revision: (current?.revision ?? 0) + 1,
        createdFrom: current?.createdFrom ?? 'new',
        payload: asAdjustParams(draft),
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name: record.name, builtin: false, revision: record.revision };
    },

    async create(name: string): Promise<ProfileView> {
      const id = mintId();
      const record: ProfileRecord = {
        kind: 'adjust',
        id,
        name,
        revision: 1,
        createdFrom: 'new',
        payload: defaultAdjust(),
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name, builtin: false, revision: 1 };
    },

    async duplicate(id: string, name: string, draft: unknown): Promise<ProfileView> {
      const newId = mintId();
      const record: ProfileRecord = {
        kind: 'adjust',
        id: newId,
        name,
        revision: 1,
        createdFrom: `copy:${id}`,
        payload: asAdjustParams(draft),
      };
      await store().putProfile(record);
      records.set(newId, record);
      return { id: newId, name, builtin: false, revision: 1 };
    },

    async rename(id: string, name: string): Promise<ProfileView> {
      const current = records.get(id);
      if (current === undefined) throw new Error('Only saved profiles can be renamed.');
      const record = { ...current, name, revision: current.revision + 1 };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name, builtin: false, revision: record.revision };
    },

    async remove(id: string): Promise<void> {
      await store().deleteProfile('adjust', id);
      records.delete(id);
    },

    resolveDraftParams(draft: unknown): AdjustParams {
      return asAdjustParams(draft);
    },

    mountForm(container: HTMLElement, onEdit: (draft: unknown) => void): KindFormHandle {
      let draft: AdjustParams = defaultAdjust();
      let readOnly = false;

      const edited = (): void => {
        syncValues();
        onEdit(structuredClone(draft));
      };

      const curveControl = createCurveControl(
        doc,
        {
          idPrefix: 'adjust',
          summary: 'Lightness curve',
          open: true,
          helper:
            'Remaps the picture before anything else — the bottom and top points ARE the black and white points, so pulling them in stretches contrast. Tab to a point, arrows nudge, Shift for bigger steps.',
        },
        (curve) => {
          if (readOnly) return;
          draft = { ...draft, curve };
          edited();
        },
      );

      // Saturation — one factor over Lab a/b, shown as a percentage of
      // the picture's own colour so 100 % reads as "untouched".
      const satField = doc.createElement('div');
      satField.className = 'field';
      const satLabel = doc.createElement('label');
      satLabel.htmlFor = 'adjust-saturation';
      satLabel.textContent = 'Saturation';
      const satRow = doc.createElement('div');
      satRow.className = 'stitch-size-row';
      const satRange = doc.createElement('input');
      satRange.type = 'range';
      satRange.id = 'adjust-saturation';
      satRange.min = '0';
      satRange.max = String(saturationToPercent(MAX_SATURATION));
      satRange.step = '5';
      const satValue = doc.createElement('span');
      satValue.className = 'meta';
      const satHelper = doc.createElement('p');
      satHelper.className = 'helper';
      satHelper.id = 'adjust-saturation-helper';
      satHelper.textContent =
        '100 % leaves colour as it is; 0 % is greyscale — the natural feed for tone matching.';
      satRange.setAttribute('aria-describedby', satHelper.id);
      satRange.addEventListener('input', () => {
        if (readOnly) return;
        draft = { ...draft, saturation: percentToSaturation(Number(satRange.value)) };
        edited();
      });
      satRow.append(satRange, satValue);
      satField.append(satLabel, satRow, satHelper);

      // The basis line: why a built-in exists (the D61 evidence shape).
      const basisLine = doc.createElement('p');
      basisLine.className = 'meta';
      basisLine.hidden = true;

      container.append(curveControl.element, satField, basisLine);

      function syncValues(): void {
        curveControl.update(draft.curve, readOnly);
        if (doc.activeElement !== satRange) {
          satRange.value = String(saturationToPercent(draft.saturation));
        }
        satValue.textContent = `${String(saturationToPercent(draft.saturation))}%`;
        satRange.disabled = readOnly;
      }

      return {
        setDraft(next: unknown, nextReadOnly: boolean): void {
          draft = asAdjustParams(next);
          readOnly = nextReadOnly;
          const preset = ADJUST_PRESETS.find((p) => sameAdjust(p.params, draft));
          basisLine.hidden = !nextReadOnly || preset === undefined;
          if (preset !== undefined) basisLine.textContent = `Why: ${preset.basis}.`;
          syncValues();
        },
      };
    },
  };

  return adapter;
}
