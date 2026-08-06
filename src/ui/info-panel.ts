/**
 * Info panel (§11 subset bound to the preview): a summary line plus a
 * colours-by-usage table, re-rendered per processed frame. The row
 * model is pure (tested in node); only createInfoPanel touches the
 * DOM. Thread colours in swatches are content, not UI tokens
 * (UI-STANDARDS → "Colour fidelity").
 */

import type { ColorUsage, DesignStats } from '../core/stats.ts';

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
    // A mapped colour is flagged in the tooltip rather than left to
    // look like a manufacturer measurement (M7-BRAND-01).
    const provenance =
      thread.provenance === 'mapped' ? ' · colour mapped, not measured' : '';
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

/**
 * The one-line design summary shown above the table. No dimensions
 * (M14-FIX-05): the view strip's readout already says "200 × 200
 * stitches" a few lines up, and the duplication was height the
 * companion posture cannot spare.
 */
export function summaryText(stats: DesignStats): string {
  const stitches = stats.stitchCount === 1 ? 'stitch' : 'stitches';
  const colours = stats.colorCount === 1 ? 'colour' : 'colours';
  return (
    `${formatCount(stats.stitchCount)} ${stitches} ` +
    `(${formatCount(stats.emptyCount)} empty) · ` +
    `${formatCount(stats.colorCount)} ${colours}`
  );
}

/**
 * The disclosure's visible line (M14-EXT-14): collapsed by default,
 * the summary must still inform — count plus the leading thread, so
 * the table's headline survives the fold under the default-8 palette.
 * Derived from owned stats at render, never scraped from the DOM.
 */
export function usageSummaryLabel(
  stats: DesignStats,
  brandNames?: ReadonlyMap<string, string>,
): string {
  const lead = stats.perColor[0];
  if (lead === undefined) return 'Colours by usage';
  const thread = lead.thread;
  const leadLabel =
    thread === undefined
      ? lead.hex
      : `${brandNames?.get(thread.brandId) ?? thread.brandId} ${thread.reference}`;
  return `Colours by usage — ${formatCount(stats.colorCount)} · ${leadLabel} leads`;
}

/** The live info panel: a DOM element plus its per-frame updater. */
export interface InfoPanel {
  element: HTMLElement;
  update(stats: DesignStats): void;
  /** Clear any thread highlight (fires onChange if one was set). */
  clearHighlight(): void;
}

/** Disclosure wiring for the colours table (M14-EXT-05). */
export interface InfoPanelDepthOptions {
  open: boolean;
  onToggle(open: boolean): void;
}

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
}

/**
 * Build the panel. Starts in its empty state until the first update.
 *
 * `brandNames` labels each row with the brand as well as the
 * reference — "310" alone is not a shopping list once more than one
 * brand can be enabled. The colours table sits behind a persisted
 * fold (open by default) so the one always-on block left after the
 * IA restructure can be put away too (M14-EXT-05).
 */
export function createInfoPanel(
  doc: Document,
  brandNames?: ReadonlyMap<string, string>,
  depth?: InfoPanelDepthOptions,
  highlight?: InfoPanelHighlightOptions,
): InfoPanel {
  const element = doc.createElement('section');
  element.className = 'info-panel';

  const summary = doc.createElement('p');
  summary.id = 'design-stats';
  summary.textContent = 'No design yet — stats appear after import.';

  const details = doc.createElement('details');
  details.className = 'depth-reveal';
  const detailsSummary = doc.createElement('summary');
  detailsSummary.textContent = 'Colours by usage';
  const detailsBody = doc.createElement('div');
  detailsBody.className = 'depth-reveal-body';
  details.append(detailsSummary, detailsBody);
  // Closed by default (M14-EXT-14, flipping the D90 default on the
  // owner's ask); a persisted user choice still wins at the call site.
  details.open = depth?.open ?? false;
  details.addEventListener('toggle', () => {
    depth?.onToggle(details.open);
  });
  details.hidden = true;

  const table = doc.createElement('table');
  // The visible heading is the disclosure summary; the caption keeps
  // the table's accessible name without saying it twice on screen.
  const caption = doc.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = 'Colours by usage';
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
  thead.append(headRow);
  const tbody = doc.createElement('tbody');
  table.append(caption, thead, tbody);
  detailsBody.append(table);
  element.append(summary, details);

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
  details.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || selectedIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    changeSelection(null);
  });

  function update(stats: DesignStats): void {
    summary.textContent = summaryText(stats);
    // The caption keeps the table's accessible name; this line is the
    // disclosure's label, so the name is still said once per surface.
    detailsSummary.textContent = usageSummaryLabel(stats, brandNames);
    const { rows, overflow } = buildRows(stats.perColor, { brandNames });
    const columns = highlight === undefined ? 3 : 4;
    tbody.replaceChildren();
    highlightButtons.clear();
    rows.forEach((row, i) => {
      const tr = doc.createElement('tr');
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
    details.hidden = rows.length === 0;
  }

  return {
    element,
    update,
    clearHighlight(): void {
      if (selectedIndex !== null) changeSelection(null);
    },
  };
}
