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

/** The one-line design summary shown above the table. */
export function summaryText(stats: DesignStats): string {
  const stitches = stats.stitchCount === 1 ? 'stitch' : 'stitches';
  const colours = stats.colorCount === 1 ? 'colour' : 'colours';
  return (
    `${String(stats.width)} × ${String(stats.height)} · ` +
    `${formatCount(stats.stitchCount)} ${stitches} ` +
    `(${formatCount(stats.emptyCount)} empty) · ` +
    `${formatCount(stats.colorCount)} ${colours}`
  );
}

/** The live info panel: a DOM element plus its per-frame updater. */
export interface InfoPanel {
  element: HTMLElement;
  update(stats: DesignStats): void;
}

/** Disclosure wiring for the colours table (M14-EXT-05). */
export interface InfoPanelDepthOptions {
  open: boolean;
  onToggle(open: boolean): void;
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
  details.open = depth?.open ?? true;
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

  function update(stats: DesignStats): void {
    summary.textContent = summaryText(stats);
    const { rows, overflow } = buildRows(stats.perColor, { brandNames });
    tbody.replaceChildren();
    for (const row of rows) {
      const tr = doc.createElement('tr');
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
    }
    if (overflow !== null) {
      const tr = doc.createElement('tr');
      const td = doc.createElement('td');
      td.colSpan = 3;
      td.textContent =
        `+ ${formatCount(overflow.colors)} more colours · ` +
        `${formatCount(overflow.count)} stitches`;
      tr.append(td);
      tbody.append(tr);
    }
    details.hidden = rows.length === 0;
  }

  return { element, update };
}
