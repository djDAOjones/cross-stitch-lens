/**
 * The editor's judgement preview (M15-UI-04, D114/D116): the design's
 * last still by default, four owner-supplied photo slots with honest
 * offline states, the generated test card, and the three-resolution
 * grid — every render through the **real pipeline** against the
 * draft, draft-labelled, debounced and latest-wins so a live capture
 * session's cadence is never starved.
 *
 * Kind-generic by contract (D116): the rig renders "the pipeline with
 * a draft-overridden stage" — the kind supplies the override mapping,
 * never the rig. The dither kind (M15-DITH-02) reuses this whole.
 */

import type { PipelineConfig } from '../core/pipeline/config.ts';
import type { PixelBuffer } from '../core/types.ts';
import { sampleBuffer } from './sample.ts';

/** Debounce for draft-driven re-renders. */
export const PREVIEW_DEBOUNCE_MS = 150;

/** The photo slots: file names under /profile-demo/. */
export const PHOTO_SLOTS = [
  { id: 'landscape', label: 'Landscape photo', file: 'landscape.png' },
  { id: 'cartoon', label: 'Cartoon object', file: 'cartoon.png' },
  { id: 'portrait', label: 'Portrait photo', file: 'portrait.png' },
  { id: 'text', label: 'Text in three fonts', file: 'text.png' },
] as const;

/** The grid divisors: blocks grow visibly as resolution drops. */
export const GRID_DIVISORS = [1, 4, 16] as const;

/** Divide a grid side, floored at a readable minimum. */
export function dividedGrid(
  grid: { width: number; height: number },
  divisor: number,
): { width: number; height: number } {
  return {
    width: Math.max(8, Math.round(grid.width / divisor)),
    height: Math.max(8, Math.round(grid.height / divisor)),
  };
}

/** What the rig needs from the host. */
export interface EditorPreviewDeps {
  /** One full-quality render through the real pipeline (worker route). */
  render(buffer: PixelBuffer, config: PipelineConfig): Promise<PixelBuffer>;
  /** The design's last processed still, or null before any source. */
  designStill(): PixelBuffer | null;
  /** The app's current pipeline config — the geometry base. */
  baseConfig(): PipelineConfig;
  /** The kind's stage override (D116): pipeline + draft, never recipe. */
  overrideConfig(draft: unknown, base: PipelineConfig): PipelineConfig;
  /** Load one photo slot; null when the file is absent (offline). */
  loadSlot?(file: string): Promise<PixelBuffer | null>;
}

/** Fetch + decode a demo slot from the public folder. */
export async function fetchSlot(
  file: string,
  decode: (blob: Blob) => Promise<PixelBuffer>,
): Promise<PixelBuffer | null> {
  try {
    const response = await fetch(`/profile-demo/${file}`);
    if (!response.ok) return null;
    const blob = await response.blob();
    // Vite's dev server answers missing files with index.html; a
    // non-image content type is an absent slot, not a broken one.
    if (!blob.type.startsWith('image/')) return null;
    return await decode(blob);
  } catch {
    return null;
  }
}

/** The mounted rig. */
export interface EditorPreview {
  element: HTMLElement;
  /** The draft moved — re-render soon (debounced, latest-wins). */
  draftChanged(draft: unknown): void;
}

/** Build the preview rig. */
export function createEditorPreview(doc: Document, deps: EditorPreviewDeps): EditorPreview {
  const element = doc.createElement('div');
  element.className = 'editor-preview-rig';

  const headRow = doc.createElement('div');
  headRow.className = 'toolbar';
  const viewField = doc.createElement('div');
  viewField.className = 'field';
  const viewLabel = doc.createElement('label');
  viewLabel.htmlFor = 'preview-view';
  viewLabel.textContent = 'Preview';
  const viewSelect = doc.createElement('select');
  viewSelect.id = 'preview-view';
  const options: [string, string][] = [
    ['design', 'The design'],
    ...PHOTO_SLOTS.map((s): [string, string] => [s.id, s.label]),
    ['card', 'Test card'],
    ['grid', 'All at three resolutions'],
  ];
  for (const [value, label] of options) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = label;
    viewSelect.append(option);
  }
  viewField.append(viewLabel, viewSelect);
  headRow.append(viewField);

  // Draft labelling (the M4 rule): a preview is never mistakable for
  // export quality.
  const draftNote = doc.createElement('p');
  draftNote.className = 'meta';
  draftNote.textContent = 'Draft preview — exports always run at full quality.';

  const stage = doc.createElement('div');
  stage.className = 'editor-preview-stage';

  element.append(headRow, draftNote, stage);

  let draft: unknown = null;
  let timer: number | null = null;
  let renderToken = 0;

  const slotCache = new Map<string, PixelBuffer | null>();

  async function slotBuffer(id: string): Promise<PixelBuffer | null> {
    if (id === 'design') return deps.designStill();
    if (id === 'card') return sampleBuffer();
    const slot = PHOTO_SLOTS.find((s) => s.id === id);
    if (slot === undefined) return null;
    if (!slotCache.has(slot.file)) {
      const loaded = (await deps.loadSlot?.(slot.file)) ?? null;
      slotCache.set(slot.file, loaded);
    }
    return slotCache.get(slot.file) ?? null;
  }

  function offlineText(id: string): string {
    if (id === 'design') return 'No design yet — load a source, or pick another preview.';
    const slot = PHOTO_SLOTS.find((s) => s.id === id);
    return slot === undefined
      ? 'Not available.'
      : `Image offline — add ${slot.file} to the profile-demo folder.`;
  }

  /** Draw one rendered buffer into a labelled cell. */
  function cell(labelText: string): { wrap: HTMLElement; canvas: HTMLCanvasElement } {
    const wrap = doc.createElement('figure');
    wrap.className = 'preview-cell';
    const canvas = doc.createElement('canvas');
    canvas.className = 'preview-cell-canvas';
    const label = doc.createElement('figcaption');
    label.className = 'meta';
    label.textContent = labelText;
    wrap.append(canvas, label);
    return { wrap, canvas };
  }

  function paint(canvas: HTMLCanvasElement, buffer: PixelBuffer): void {
    canvas.width = buffer.width;
    canvas.height = buffer.height;
    const context = canvas.getContext('2d');
    if (context === null) return;
    context.putImageData(
      new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height),
      0,
      0,
    );
  }

  async function renderView(): Promise<void> {
    const token = ++renderToken;
    const view = viewSelect.value;
    const base = deps.baseConfig();

    if (view === 'grid') {
      const cells: { label: string; source: PixelBuffer; grid: { width: number; height: number } }[] = [];
      for (const [id, label] of options) {
        if (id === 'grid') continue;
        const source = await slotBuffer(id);
        if (source === null) continue;
        for (const divisor of GRID_DIVISORS) {
          cells.push({
            label: `${label} ÷${String(divisor)}`,
            source,
            grid: dividedGrid(base.grid, divisor),
          });
        }
      }
      if (token !== renderToken) return;
      stage.replaceChildren();
      if (cells.length === 0) {
        const empty = doc.createElement('p');
        empty.className = 'meta';
        empty.textContent =
          'Nothing to preview yet — load a source or add photos to the profile-demo folder.';
        stage.append(empty);
        return;
      }
      const grid = doc.createElement('div');
      grid.className = 'preview-grid';
      stage.append(grid);
      for (const item of cells) {
        const { wrap, canvas } = cell(item.label);
        grid.append(wrap);
        const config = deps.overrideConfig(draft, { ...base, grid: item.grid });
        // Sequential renders, latest-wins: a newer draft abandons the
        // rest of the sweep rather than racing it.
        const rendered = await deps.render(item.source, config);
        if (token !== renderToken) return;
        paint(canvas, rendered);
      }
      return;
    }

    const source = await slotBuffer(view);
    if (token !== renderToken) return;
    stage.replaceChildren();
    if (source === null) {
      const offline = doc.createElement('p');
      offline.className = 'meta preview-offline';
      offline.textContent = offlineText(view);
      stage.append(offline);
      return;
    }
    const { wrap, canvas } = cell(options.find(([id]) => id === view)?.[1] ?? view);
    stage.append(wrap);
    const rendered = await deps.render(source, deps.overrideConfig(draft, base));
    if (token !== renderToken) return;
    paint(canvas, rendered);
  }

  function renderSoon(): void {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void renderView();
    }, PREVIEW_DEBOUNCE_MS) as unknown as number;
  }

  viewSelect.addEventListener('change', renderSoon);

  return {
    element,
    draftChanged(next: unknown): void {
      draft = next;
      renderSoon();
    },
  };
}
