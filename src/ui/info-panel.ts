/**
 * Info panel (§11 subset bound to the preview): the "Colours used"
 * table, re-rendered per processed frame. The headline numbers moved
 * to the Stats section (M14-EXT-21 — one owner per figure). Since
 * M14-EXT-41 the panel is bare section *content*: the host mounts it
 * in a real accordion section (one hierarchy across every region),
 * so the D99-lineage `<details>` fold is gone and the host learns
 * about empty states through `onContent`. The row model is pure
 * (tested in node); only createInfoPanel touches the DOM. Thread
 * colours in swatches are content, not UI tokens (UI-STANDARDS →
 * "Colour fidelity"). Since ICE-SYMBOL-UI-01 the table is also the
 * live symbol key: a Symbol column (present only while the design can
 * carry symbols) shows each thread's glyph with a button into the
 * override picker (`symbol-picker.ts`).
 */

import type { ColorUsage, DesignStats } from '../core/stats.ts';
import type { SymbolGlyph } from '../core/symbols/glyphs.ts';
import { glyphElement } from './symbol-picker.ts';

/** Rows above the cap collapse into one aggregate line. */
export const ROW_CAP = 30;

/** One rendered table row. */
export interface ColorRow {
  /** Swatch colour, #rrggbb. */
  hex: string;
  /**
   * Visible label: "brand reference name" when the stitch was
   * identified, else the hex. Brand and reference are in the label
   * rather than a tooltip because they are what you take to the shop
   * (M7-BRAND-02).
   */
  label: string;
  count: number;
  percentText: string;
  /** Hover tooltip; always carries the hex (colour-fidelity rule). */
  title: string;
}

/** Options for {@link buildRows}. */
export interface RowOptions {
  /** Brand id → display name, e.g. `"dmc"` → `"DMC"`. */
  brandNames?: ReadonlyMap<string, string> | undefined;
  cap?: number | undefined;
}

/** The capped row set plus what the cap folded away. */
export interface RowSet {
  rows: ColorRow[];
  /** Colours beyond the cap, aggregated; null when everything fits. */
  overflow: { colors: number; count: number } | null;
}

/** UK-style grouped integer (1,234) — fixed locale for determinism. */
function formatCount(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Percent to one decimal; tiny non-zero shares read "<0.1%". */
export function formatPercent(percent: number): string {
  if (percent === 0) return '0%';
  if (percent < 0.1) return '<0.1%';
  const rounded = Math.round(percent * 10) / 10;
  return `${String(Number.isInteger(rounded) ? rounded : rounded.toFixed(1))}%`;
}

/** Build the capped, formatted row model from sorted per-colour usage. */
export function buildRows(perColor: ColorUsage[], options: RowOptions = {}): RowSet {
  const cap = options.cap ?? ROW_CAP;
  const shown = perColor.slice(0, cap);
  const rows = shown.map((usage) => {
    const thread = usage.thread;
    if (thread === undefined) {
      return {
        hex: usage.hex,
        label: usage.hex,
        count: usage.count,
        percentText: formatPercent(usage.percent),
        title: usage.hex,
      };
    }
    const brand = options.brandNames?.get(thread.brandId) ?? thread.brandId;
    // A mapped colour is flagged in the tooltip (M7-BRAND-01) by
    // saying where it came from — never "not measured", which implied
    // the catalogue rows were (they are compiled, uncalibrated — D161;
    // DATA-05 ahead of DATA-03's relabel).
    const provenance =
      thread.provenance === 'mapped' ? ' · colour mapped from its DMC equivalent' : '';
    return {
      hex: usage.hex,
      // Hex rides in the visible label (audit A14): a title tooltip is
      // hover-only, unreachable by keyboard and silent to AT.
      label: `${brand} ${thread.reference} ${thread.name}`.trim() + ` · ${usage.hex}`,
      count: usage.count,
      percentText: formatPercent(usage.percent),
      title: `${usage.hex} · ${thread.name}${provenance}`,
    };
  });
  const rest = perColor.slice(cap);
  const overflow =
    rest.length === 0
      ? null
      : {
          colors: rest.length,
          count: rest.reduce((sum, usage) => sum + usage.count, 0),
        };
  return { rows, overflow };
}

/** The live info panel: a DOM element plus its per-frame updater. */
export interface InfoPanel {
  element: HTMLElement;
  update(stats: DesignStats): void;
  /** Re-render the last stats — for state that changed under an unchanged frame (a symbol pick). */
  refresh(): void;
  /** Clear any thread highlight (fires onChange if one was set). */
  clearHighlight(): void;
}

/** Host notifications about the table's content (M14-EXT-41): the
 *  section wrapper hides while there are no rows, and only the panel
 *  knows. */
export type InfoPanelContentListener = (hasRows: boolean) => void;

/** A selected highlight row, as reported to the host (M14-EXT-17). */
export interface HighlightSelection {
  /** Palette index of the thread. */
  index: number;
  /** Row label without the hex tail — announcement material. */
  label: string;
  /** Stitches in this colour at selection time. */
  count: number;
}

/** Thread-highlight wiring (M14-EXT-17). */
export interface InfoPanelHighlightOptions {
  /** Palette index for a usage row; null = row not highlightable. */
  indexFor(usage: ColorUsage): number | null;
  /** Selection changed (null = cleared). */
  onChange(selection: HighlightSelection | null): void;
  /**
   * Remove this colour from the design's profile copy (M15-UI-01) —
   * lands on the copy, never the shared library. Omit to hide the
   * action column.
   */
  onRemove?(index: number, label: string): void;
}

/** Symbol column wiring (ICE-SYMBOL-UI-01). */
export interface InfoPanelSymbolOptions {
  /**
   * Whether the design can carry symbols at all — a thread palette
   * with per-stitch identities. The column is absent otherwise rather
   * than full of "Auto": a chart that cannot be a symbol chart has no
   * symbols to show.
   */
  available(): boolean;
  /** The glyph this thread wears (or will), or null for "assigned at export". */
  glyphFor(usage: ColorUsage): SymbolGlyph | null;
  /** The row's symbol button was pressed. */
  onPick(usage: ColorUsage, label: string): void;
}

/**
 * Build the panel content. Starts empty until the first update.
 *
 * `brandNames` labels each row with the brand as well as the
 * reference — "310" alone is not a shopping list once more than one
 * brand can be enabled. The host owns the section header and
 * disclosure ("Colours used", M14-EXT-41); this element is the
 * panel's content alone.
 */
export function createInfoPanel(
  doc: Document,
  brandNames?: ReadonlyMap<string, string>,
  onContent?: InfoPanelContentListener,
  highlight?: InfoPanelHighlightOptions,
  symbols?: InfoPanelSymbolOptions,
): InfoPanel {
  const element = doc.createElement('div');
  element.className = 'info-panel';

  const table = doc.createElement('table');
  // The visible heading is the section header; the caption keeps the
  // table's accessible name without saying it twice on screen.
  const caption = doc.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = 'Colours used';
  const thead = doc.createElement('thead');
  const headRow = doc.createElement('tr');
  if (highlight !== undefined) {
    // The highlight column's header is real but visually quiet — a
    // column of toggle buttons still needs a name.
    const th = doc.createElement('th');
    th.scope = 'col';
    const hidden = doc.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = 'Highlight';
    th.append(hidden);
    headRow.append(th);
  }
  for (const text of ['Colour', 'Stitches', '%']) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    if (text !== 'Colour') th.className = 'num';
    headRow.append(th);
  }
  // The Symbol column (ICE-SYMBOL-UI-01) is data — the key the chart
  // will print — so its header is visible, unlike the control-only
  // Highlight and Remove columns. It renders only while the design
  // can carry symbols; the header follows per update.
  let symbolHeader: HTMLTableCellElement | null = null;
  if (symbols !== undefined) {
    symbolHeader = doc.createElement('th');
    symbolHeader.scope = 'col';
    symbolHeader.textContent = 'Symbol';
    symbolHeader.hidden = true;
    headRow.append(symbolHeader);
  }
  if (highlight?.onRemove !== undefined) {
    const th = doc.createElement('th');
    th.scope = 'col';
    const hidden = doc.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = 'Remove from profile';
    th.append(hidden);
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = doc.createElement('tbody');
  table.append(caption, thead, tbody);
  element.append(table);

  // Thread highlight (M14-EXT-17): one selected palette index at a
  // time, session-only. Selection is keyed by palette index — the
  // sidecar's own vocabulary — and survives the per-frame row rebuild.
  let selectedIndex: number | null = null;
  const highlightButtons = new Map<number, HTMLButtonElement>();

  function markPressed(): void {
    for (const [index, button] of highlightButtons) {
      button.setAttribute('aria-pressed', String(index === selectedIndex));
    }
  }

  function changeSelection(next: HighlightSelection | null): void {
    selectedIndex = next === null ? null : next.index;
    markPressed();
    highlight?.onChange(next);
  }

  // Escape clears the highlight from anywhere inside the table region
  // — one deliberate step, before it would bubble to canvas/section
  // handlers. Only when a highlight is set; otherwise pass through.
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || selectedIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    changeSelection(null);
  });

  let lastStats: DesignStats | null = null;

  function update(stats: DesignStats): void {
    lastStats = stats;
    const { rows, overflow } = buildRows(stats.perColor, { brandNames });
    const showSymbols = symbols !== undefined && symbols.available();
    if (symbolHeader !== null) symbolHeader.hidden = !showSymbols;
    const columns =
      (highlight === undefined ? 3 : highlight.onRemove === undefined ? 4 : 5) +
      (showSymbols ? 1 : 0);
    // A rebuild must not drop focus (UI-STANDARDS → shell state): a
    // button pressed mid-capture, or the symbol button a picker just
    // returned focus to, is re-found by its row's thread and its slot
    // in the row after the new rows mount.
    const active = doc.activeElement;
    let restore: { key: string; slot: number } | null = null;
    if (active instanceof HTMLElement && tbody.contains(active)) {
      const tr = active.closest('tr');
      const key = tr?.dataset['key'];
      const slot = tr === null ? -1 : [...tr.querySelectorAll('button')].indexOf(active as HTMLButtonElement);
      if (key !== undefined && slot >= 0) restore = { key, slot };
    }
    tbody.replaceChildren();
    highlightButtons.clear();
    rows.forEach((row, i) => {
      const tr = doc.createElement('tr');
      tr.dataset['key'] = stats.perColor[i]?.thread?.id ?? row.hex;
      if (highlight !== undefined) {
        // buildRows maps perColor 1:1 under the cap, so the raw usage
        // for this rendered row is perColor[i].
        const raw = stats.perColor[i];
        const index = raw === undefined ? null : highlight.indexFor(raw);
        const cell = doc.createElement('td');
        cell.className = 'highlight-cell';
        if (index !== null && raw !== undefined) {
          const button = doc.createElement('button');
          button.type = 'button';
          button.textContent = 'Highlight';
          // Per-row accessible name over a short visible label — the
          // sanctioned A2 pattern ("Own {thread}", ui-spec §5).
          const plainLabel = row.label.split(' · #')[0] ?? row.label;
          button.setAttribute('aria-label', `Highlight ${plainLabel}`);
          button.setAttribute('aria-pressed', String(index === selectedIndex));
          button.addEventListener('click', () => {
            changeSelection(
              index === selectedIndex
                ? null
                : { index, label: plainLabel, count: raw.count },
            );
          });
          highlightButtons.set(index, button);
          cell.append(button);
        }
        tr.append(cell);
      }
      const colour = doc.createElement('td');
      colour.title = row.title;
      const swatch = doc.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = row.hex;
      swatch.setAttribute('aria-hidden', 'true');
      colour.append(swatch, doc.createTextNode(row.label));
      const count = doc.createElement('td');
      count.className = 'num';
      count.textContent = formatCount(row.count);
      const percent = doc.createElement('td');
      percent.className = 'num';
      percent.textContent = row.percentText;
      tr.append(colour, count, percent);
      if (showSymbols && symbols !== undefined) {
        const cell = doc.createElement('td');
        cell.className = 'symbol-cell';
        const raw = stats.perColor[i];
        if (raw?.thread !== undefined) {
          const plainLabel = row.label.split(' · #')[0] ?? row.label;
          const glyph = symbols.glyphFor(raw);
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'symbol-button';
          const name = doc.createElement('span');
          // The visible text is the glyph's name (or "Auto"); the
          // accessible name starts with it and adds the thread — the
          // A2 pattern the Highlight button uses.
          name.textContent = glyph === null ? 'Auto' : glyph.name;
          if (glyph !== null) button.append(glyphElement(doc, glyph));
          button.append(name);
          button.setAttribute(
            'aria-label',
            glyph === null
              ? `Auto: choose the symbol for ${plainLabel}`
              : `${glyph.name}: change the symbol for ${plainLabel}`,
          );
          button.addEventListener('click', () => {
            symbols.onPick(raw, plainLabel);
          });
          cell.append(button);
        }
        tr.append(cell);
      }
      if (highlight?.onRemove !== undefined) {
        const cell = doc.createElement('td');
        const raw = stats.perColor[i];
        const index = raw === undefined ? null : highlight.indexFor(raw);
        if (index !== null) {
          const plainLabel = row.label.split(' · #')[0] ?? row.label;
          const remove = doc.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Remove';
          remove.setAttribute('aria-label', `Remove ${plainLabel} from the profile`);
          remove.addEventListener('click', () => {
            highlight.onRemove?.(index, plainLabel);
          });
          cell.append(remove);
        }
        tr.append(cell);
      }
      tbody.append(tr);
    });
    if (overflow !== null) {
      const tr = doc.createElement('tr');
      const td = doc.createElement('td');
      td.colSpan = columns;
      td.textContent =
        `+ ${formatCount(overflow.colors)} more colours · ` +
        `${formatCount(overflow.count)} stitches`;
      tr.append(td);
      tbody.append(tr);
    }
    if (restore !== null) {
      const again = [...tbody.querySelectorAll('tr')].find((tr) => tr.dataset['key'] === restore.key);
      again?.querySelectorAll('button')[restore.slot]?.focus();
    }
    // The host hides the whole section while there is nothing to
    // show (M14-EXT-41) — an open heading over an empty table is the
    // blank-panel anti-pattern.
    onContent?.(rows.length > 0);
  }

  return {
    element,
    update,
    refresh(): void {
      if (lastStats !== null) update(lastStats);
    },
    clearHighlight(): void {
      if (selectedIndex !== null) changeSelection(null);
    },
  };
}
